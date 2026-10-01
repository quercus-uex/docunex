import {
  evaluateHiring,
  HIRING_DOCUMENTS,
  type HiringDocumentKey,
  type HiringDto,
  type HiringSummaryDto,
} from '@docunex/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Application } from '../applications/application.entity.js';
import { Document } from '../documents/document.entity.js';
import { GenerationError } from '../generation/assemble.js';
import { Profile } from '../profile/profile.entity.js';
import { ProfileService } from '../profile/profile.service.js';
import { StorageService } from '../storage/storage.service.js';
import { assembleHiringPackage } from './assemble-hiring.js';
import { ApplicationHiringDocument } from './application-hiring-document.entity.js';

/** La segunda fase solo tiene sentido con la solicitud ya presentada. */
const HIRING_STATUSES = new Set<Application['status']>(['registered', 'closed']);

/** Fecha de hoy en España, en ISO. */
function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
}

/**
 * Segunda fase de una solicitud (formalización del contrato): los datos del perfil para el contrato y
 * los documentos vinculados a cada entrada de `HIRING_DOCUMENTS`.
 */
@Injectable()
export class HiringService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    @InjectRepository(ApplicationHiringDocument)
    private readonly links: Repository<ApplicationHiringDocument>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    private readonly profileService: ProfileService,
    private readonly storage: StorageService,
  ) {}

  async get(userId: string, applicationId: string): Promise<HiringDto> {
    const application = await this.findOwned(userId, applicationId);
    const [data, links] = await Promise.all([
      this.profileService.getHiringData(userId),
      this.loadLinks([applicationId]),
    ]);
    return {
      applicationId,
      editable: application.status === 'registered',
      data,
      status: evaluateHiring({ data, documents: groupByRequirement(links) }),
    };
  }

  /** Sustituye los documentos vinculados a una entrada de la lista. */
  async setDocuments(
    userId: string,
    applicationId: string,
    requirement: HiringDocumentKey,
    documentIds: string[],
  ): Promise<HiringDto> {
    const application = await this.findOwned(userId, applicationId);
    if (application.status !== 'registered') {
      throw new ConflictException(
        application.status === 'closed'
          ? 'La solicitud está cerrada: reábrela para cambiar la documentación de la segunda fase'
          : 'La segunda fase se abre cuando la solicitud está registrada',
      );
    }
    if (
      documentIds.length > 0 &&
      (await this.documents.countBy({ userId, id: In(documentIds) })) !== documentIds.length
    ) {
      throw new BadRequestException('Los documentos deben ser tuyos');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ApplicationHiringDocument, { applicationId, requirement });
      if (documentIds.length > 0) {
        await manager.insert(
          ApplicationHiringDocument,
          documentIds.map((documentId, position) => ({
            applicationId,
            requirement,
            documentId,
            position,
          })),
        );
      }
    });
    return this.get(userId, applicationId);
  }

  /** Progreso de la segunda fase de las solicitudes registradas o cerradas (lista de solicitudes). */
  async summaries(
    userId: string,
    applications: Pick<Application, 'id' | 'status'>[],
  ): Promise<Map<string, HiringSummaryDto>> {
    const ids = applications
      .filter((application) => HIRING_STATUSES.has(application.status))
      .map((application) => application.id);
    if (ids.length === 0) return new Map();
    const [data, links] = await Promise.all([
      this.profileService.getHiringData(userId),
      this.loadLinks(ids),
    ]);
    return new Map(
      ids.map((id) => {
        const { requiredDone, requiredTotal, complete } = evaluateHiring({
          data,
          documents: groupByRequirement(links.filter((link) => link.applicationId === id)),
        });
        return [id, { requiredDone, requiredTotal, complete }];
      }),
    );
  }

  /** PDF con la portada de la segunda fase y los documentos vinculados. */
  async buildFile(
    userId: string,
    applicationId: string,
  ): Promise<{ data: Uint8Array; filename: string }> {
    const application = await this.applications.findOne({
      where: { id: applicationId, userId },
      relations: { position: true, registryEntries: true },
    });
    if (!application?.position) throw new NotFoundException('Solicitud no encontrada');
    if (!HIRING_STATUSES.has(application.status)) {
      throw new ConflictException('La segunda fase se abre cuando la solicitud está registrada');
    }
    const [profile, links] = await Promise.all([
      this.profiles.findOneBy({ userId }),
      this.loadLinks([applicationId]),
    ]);
    for (const { document } of links) {
      if (document!.status !== 'ready' || !document!.pdfKey) {
        throw new ConflictException(
          `El documento "${document!.name}" todavía no está listo: espera a que se procese o quítalo`,
        );
      }
    }
    const byRequirement = groupByRequirement(links);
    const registry = [...(application.registryEntries ?? [])].sort(
      (a, b) => a.registeredAt.getTime() - b.registeredAt.getTime(),
    )[0];
    const applicant = {
      lastNames: profile?.lastNames ?? null,
      firstName: profile?.firstName ?? null,
      dni: profile?.dni ?? null,
      birthDate: profile?.birthDate ?? null,
      address: profile?.address ?? null,
      postalCode: profile?.postalCode ?? null,
      city: profile?.city ?? null,
      province: profile?.province ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    };

    try {
      const { pdf } = await assembleHiringPackage(
        {
          sheet: {
            applicant,
            hiring: {
              iban: profile?.iban ?? null,
              socialSecurityNumber: profile?.socialSecurityNumber ?? null,
              nationality: profile?.nationality ?? null,
              birthPlace: profile?.birthPlace ?? null,
            },
            positionCode: application.position.code,
            positionTitle: application.position.title,
            registryNumber: registry?.number ?? null,
            date: today(),
          },
          items: HIRING_DOCUMENTS.map((item) => ({
            label: item.label,
            required: item.required,
            documents: (byRequirement[item.key] ?? []).map(({ id, name, pdfKey }) => ({
              id,
              name,
              pdfKey,
            })),
          })),
        },
        (document) => this.storage.read(document.pdfKey!),
      );
      const name = [applicant.lastNames, applicant.firstName].filter(Boolean).join(', ');
      return {
        data: pdf,
        filename: `Contratación ${application.position.code}${name ? ` - ${name}` : ''}.pdf`,
      };
    } catch (error) {
      if (error instanceof GenerationError) throw new ConflictException(error.message);
      throw error;
    }
  }

  private async loadLinks(applicationIds: string[]) {
    return this.links.find({
      where: { applicationId: In(applicationIds) },
      relations: { document: true },
      order: { position: 'ASC' },
    });
  }

  private async findOwned(userId: string, id: string): Promise<Application> {
    const application = await this.applications.findOneBy({ id, userId });
    if (!application) throw new NotFoundException('Solicitud no encontrada');
    return application;
  }
}

/** Documentos vinculados agrupados por entrada, en su orden. */
function groupByRequirement(links: ApplicationHiringDocument[]): Record<string, Document[]> {
  const groups: Record<string, Document[]> = {};
  for (const link of links) {
    if (link.document) (groups[link.requirement] ??= []).push(link.document);
  }
  return groups;
}
