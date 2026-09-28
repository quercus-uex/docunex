import {
  type ApplicationDto,
  defaultExpone,
  defaultSolicita,
  type PackageSummaryDto,
  type updateApplicationSchema,
  validateApplication,
  type ValidationResult,
} from '@docunex/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { z } from 'zod';
import { Document } from '../documents/document.entity.js';
import { PackagesService } from '../generation/packages.service.js';
import { toValidationInput } from '../generation/snapshot.js';
import { SnapshotService } from '../generation/snapshot.service.js';
import { Merit } from '../merits/merit.entity.js';
import { PositionsService } from '../positions/positions.service.js';
import { ApplicationMerit } from './application-merit.entity.js';
import { ApplicationRequirementDocument } from './application-requirement-document.entity.js';
import { Application } from './application.entity.js';

/** Fecha de hoy en España, en ISO. */
function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    @InjectRepository(Merit) private readonly merits: Repository<Merit>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    private readonly positions: PositionsService,
    private readonly snapshots: SnapshotService,
    private readonly packages: PackagesService,
  ) {}

  async list(userId: string): Promise<ApplicationDto[]> {
    const applications = await this.query(userId)
      .orderBy('application.createdAt', 'DESC')
      .getMany();
    const latest = await this.packages.latest(applications.map((application) => application.id));
    return applications.map((application) =>
      toApplicationDto(application, latest.get(application.id)),
    );
  }

  async get(userId: string, id: string): Promise<ApplicationDto> {
    const application = await this.query(userId).andWhere('application.id = :id', { id }).getOne();
    if (!application) throw new NotFoundException('Solicitud no encontrada');
    const latest = await this.packages.latest([id]);
    return toApplicationDto(application, latest.get(id));
  }

  /**
   * Crea un borrador con la fecha de hoy, los textos propuestos y todos los méritos seleccionados, en
   * el orden de la lista de méritos.
   */
  async create(userId: string, positionId: string): Promise<ApplicationDto> {
    const position = await this.positions.findOwned(userId, positionId);
    const merits = await this.merits
      .createQueryBuilder('merit')
      .select(['merit.id'])
      .where({ userId })
      .orderBy('merit.sortDate', 'DESC', 'NULLS LAST')
      .addOrderBy('merit.createdAt', 'DESC')
      .getMany();
    const id = await this.dataSource.transaction(async (manager) => {
      const application = await manager.save(
        manager.create(Application, {
          userId,
          positionId,
          status: 'draft',
          applicationDate: today(),
          expone: defaultExpone(position),
          solicita: defaultSolicita(position),
        }),
      );
      if (merits.length > 0) {
        await manager.insert(
          ApplicationMerit,
          merits.map((merit, position) => ({
            applicationId: application.id,
            meritId: merit.id,
            position,
          })),
        );
      }
      return application.id;
    });
    return this.get(userId, id);
  }

  async update(
    userId: string,
    id: string,
    input: z.output<typeof updateApplicationSchema>,
  ): Promise<ApplicationDto> {
    const application = await this.findOwned(userId, id);
    if (input.positionId) await this.positions.findOwned(userId, input.positionId);
    await this.applications.save(Object.assign(application, input));
    return this.get(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const { affected } = await this.applications.delete({ id, userId });
    if (!affected) throw new NotFoundException('Solicitud no encontrada');
  }

  async setMerits(userId: string, id: string, meritIds: string[]): Promise<ApplicationDto> {
    await this.findOwned(userId, id);
    if (
      meritIds.length > 0 &&
      (await this.merits.countBy({ userId, id: In(meritIds) })) !== meritIds.length
    ) {
      throw new BadRequestException('Los méritos deben ser tuyos');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ApplicationMerit, { applicationId: id });
      if (meritIds.length > 0) {
        await manager.insert(
          ApplicationMerit,
          meritIds.map((meritId, position) => ({ applicationId: id, meritId, position })),
        );
      }
    });
    return this.get(userId, id);
  }

  async setRequirementDocuments(
    userId: string,
    id: string,
    documentIds: string[],
  ): Promise<ApplicationDto> {
    await this.findOwned(userId, id);
    if (
      documentIds.length > 0 &&
      (await this.documents.countBy({ userId, id: In(documentIds) })) !== documentIds.length
    ) {
      throw new BadRequestException('Los documentos deben ser tuyos');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ApplicationRequirementDocument, { applicationId: id });
      if (documentIds.length > 0) {
        await manager.insert(
          ApplicationRequirementDocument,
          documentIds.map((documentId, position) => ({ applicationId: id, documentId, position })),
        );
      }
    });
    return this.get(userId, id);
  }

  /** Reglas de §10 sobre los datos actuales (sin generar nada). */
  async validate(userId: string, id: string): Promise<ValidationResult> {
    return validateApplication(toValidationInput(await this.snapshots.load(userId, id)));
  }

  async generate(userId: string, id: string): Promise<PackageSummaryDto> {
    await this.findOwned(userId, id);
    return this.packages.enqueue(userId, id);
  }

  private query(userId: string) {
    return this.applications
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.position', 'position')
      .leftJoinAndSelect('application.merits', 'meritLink')
      .leftJoinAndSelect('application.requirementDocuments', 'documentLink')
      .where('application.userId = :userId', { userId });
  }

  private async findOwned(userId: string, id: string): Promise<Application> {
    const application = await this.applications.findOneBy({ id, userId });
    if (!application) throw new NotFoundException('Solicitud no encontrada');
    return application;
  }
}

function byPosition<T extends { position: number }>(links: T[] | undefined): T[] {
  return [...(links ?? [])].sort((a, b) => a.position - b.position);
}

function toApplicationDto(
  application: Application,
  latestPackage: PackageSummaryDto | undefined,
): ApplicationDto {
  const position = application.position!;
  return {
    id: application.id,
    status: application.status,
    position: {
      id: position.id,
      code: position.code,
      resolutionDate: position.resolutionDate,
      title: position.title,
      deadline: position.deadline,
    },
    applicationDate: application.applicationDate,
    expone: application.expone,
    solicita: application.solicita,
    meritIds: byPosition(application.merits).map((link) => link.meritId),
    requirementDocumentIds: byPosition(application.requirementDocuments).map(
      (link) => link.documentId,
    ),
    latestPackage: latestPackage ?? null,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}
