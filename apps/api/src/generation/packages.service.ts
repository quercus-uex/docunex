import type { PackageDto, PackageSummaryDto } from '@docunex/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Readable } from 'node:stream';
import { In, Repository } from 'typeorm';
import { JobsService } from '../jobs/jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { GENERATE_PACKAGE_QUEUE, type GeneratePackageJob } from './generation.processor.js';
import { Package } from './package.entity.js';
import { toPackageDto, toPackageSummary } from './package.mapper.js';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package) private readonly packages: Repository<Package>,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
  ) {}

  /** Crea la versión siguiente y la encola. La solicitud debe ser del usuario (lo comprueba quien llama). */
  async enqueue(userId: string, applicationId: string): Promise<PackageSummaryDto> {
    const busy = await this.packages.existsBy({
      applicationId,
      status: In(['queued', 'running']),
    });
    if (busy) throw new ConflictException('Ya se está generando el expediente de esta solicitud');
    const last = await this.packages.findOne({
      where: { applicationId },
      order: { version: 'DESC' },
      select: { id: true, version: true },
    });
    const pkg = await this.packages.save(
      this.packages.create({
        userId,
        applicationId,
        version: (last?.version ?? 0) + 1,
        status: 'queued',
        progress: 'En cola',
      }),
    );
    await this.jobs.send<GeneratePackageJob>(GENERATE_PACKAGE_QUEUE, { packageId: pkg.id });
    return toPackageSummary(pkg);
  }

  async get(userId: string, id: string): Promise<PackageDto> {
    const pkg = await this.packages.findOne({
      where: { id, userId },
      relations: { documents: true },
      order: { documents: { code: 'ASC' } },
    });
    if (!pkg) throw new NotFoundException('Expediente no encontrado');
    return toPackageDto(pkg);
  }

  /** Última versión de cada solicitud. */
  async latest(applicationIds: string[]): Promise<Map<string, PackageSummaryDto>> {
    if (applicationIds.length === 0) return new Map();
    const rows = await this.packages
      .createQueryBuilder('pkg')
      .distinctOn(['pkg.applicationId'])
      .where({ applicationId: In(applicationIds) })
      .orderBy('pkg.applicationId')
      .addOrderBy('pkg.version', 'DESC')
      .getMany();
    return new Map(rows.map((pkg) => [pkg.applicationId, toPackageSummary(pkg)]));
  }

  async openFile(
    userId: string,
    id: string,
  ): Promise<{ stream: Readable; size: number; filename: string }> {
    const pkg = await this.packages.findOne({
      where: { id, userId },
      relations: { application: { position: true } },
    });
    if (!pkg) throw new NotFoundException('Expediente no encontrado');
    if (pkg.status !== 'done' || !pkg.storageKey) {
      throw new ConflictException('El expediente no se ha generado');
    }
    const { stream, size } = await this.storage.stream(pkg.storageKey);
    const code = pkg.application?.position?.code ?? 'solicitud';
    const name = pkg.snapshot
      ? [pkg.snapshot.profile.lastNames, pkg.snapshot.profile.firstName].filter(Boolean).join(', ')
      : '';
    return { stream, size, filename: `Solicitud ${code}${name ? ` - ${name}` : ''}.pdf` };
  }
}
