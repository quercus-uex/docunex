import { MAX_PACKAGE_BYTES, validateApplication, type ValidationIssue } from '@docunex/shared';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Application } from '../applications/application.entity.js';
import { JobsService } from '../jobs/jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { assemblePackage, GenerationError } from './assemble.js';
import { GenerationEvents } from './generation-events.service.js';
import { PackageDocument } from './package-document.entity.js';
import { Package } from './package.entity.js';
import { toPackageSummary } from './package.mapper.js';
import { checkPackage } from './self-check.js';
import { toValidationInput } from './snapshot.js';
import { SnapshotService } from './snapshot.service.js';

export const GENERATE_PACKAGE_QUEUE = 'application.generate';

export interface GeneratePackageJob {
  packageId: string;
}

function sizeWarning(size: number, documents: { name: string; size: number }[]): ValidationIssue {
  const mb = (bytes: number) => (bytes / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  const largest = [...documents]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((document) => `${document.name} (${mb(document.size)} MB)`)
    .join(', ');
  return {
    code: 'SIZE_OVER_LIMIT',
    message: `El expediente ocupa ${mb(size)} MB y RedSara admite 10 MB por fichero. Los documentos más pesados: ${largest}.`,
  };
}

/** Worker que genera el expediente de una solicitud (§8). Uno cada vez. */
@Injectable()
export class GenerationProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Package) private readonly packages: Repository<Package>,
    private readonly snapshots: SnapshotService,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
    private readonly events: GenerationEvents,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.jobs.work<GeneratePackageJob>(GENERATE_PACKAGE_QUEUE, ({ packageId }) =>
      this.process(packageId),
    );
  }

  async process(packageId: string): Promise<void> {
    const pkg = await this.packages.findOneBy({ id: packageId });
    if (!pkg || pkg.status !== 'queued') return;

    const update = async (changes: Partial<Package>) => {
      Object.assign(pkg, changes);
      await this.packages.save(pkg);
      this.events.emit(toPackageSummary(pkg));
    };
    const fail = (errors: ValidationIssue[]) =>
      update({ status: 'failed', progress: null, errors, finishedAt: new Date() });

    try {
      await update({ status: 'running', progress: 'Preparando los datos' });
      const snapshot = await this.snapshots.load(pkg.userId, pkg.applicationId);
      const validation = validateApplication(toValidationInput(snapshot));
      await update({ snapshot, warnings: validation.warnings });
      if (validation.errors.length > 0) return await fail(validation.errors);

      const result = await assemblePackage(
        snapshot,
        async (document) => {
          if (!document.pdfKey)
            throw new GenerationError(`"${document.name}" no tiene versión PDF`);
          return this.storage.read(document.pdfKey);
        },
        (progress) => update({ progress }),
      );

      await update({ progress: 'Comprobando el resultado' });
      const problems = checkPackage(result.pdf, result.layout, result.documents);
      if (problems.length > 0) return await fail(problems);

      const warnings = [...validation.warnings];
      if (result.pdf.length > MAX_PACKAGE_BYTES) {
        warnings.push(sizeWarning(result.pdf.length, result.documents));
      }

      const storageKey = `${pkg.userId}/packages/${pkg.id}.pdf`;
      await this.storage.put(storageKey, result.pdf);
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(
          PackageDocument,
          result.documents.map((document) => ({ packageId: pkg.id, ...document })),
        );
        await manager.update(
          Application,
          { id: pkg.applicationId, status: 'draft' },
          { status: 'generated' },
        );
      });
      await update({
        status: 'done',
        progress: null,
        storageKey,
        size: result.pdf.length,
        pageCount: result.pageCount,
        layout: result.layout,
        warnings,
        finishedAt: new Date(),
      });
    } catch (error) {
      const expected = error instanceof GenerationError;
      if (!expected) this.logger.error(`Paquete ${pkg.id}`, (error as Error).stack);
      await fail([
        {
          code: 'GENERATION_ERROR',
          message: expected
            ? error.message
            : 'Error inesperado al generar el expediente. Vuelve a intentarlo.',
        },
      ]);
    }
  }
}
