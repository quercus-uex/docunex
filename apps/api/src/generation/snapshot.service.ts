import { getMeritType, sortByCvSection } from '@docunex/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationMerit } from '../applications/application-merit.entity.js';
import { ApplicationRequirementDocument } from '../applications/application-requirement-document.entity.js';
import { Application } from '../applications/application.entity.js';
import { Document } from '../documents/document.entity.js';
import { MeritDocument } from '../merits/merit-document.entity.js';
import { meritSummary } from '../merits/merit.mapper.js';
import { ProfileService } from '../profile/profile.service.js';
import type { GenerationSnapshot, SnapshotDocument } from './snapshot.js';

function toSnapshotDocument(document: Document): SnapshotDocument {
  return {
    id: document.id,
    name: document.name,
    kind: document.kind,
    status: document.status,
    pdfKey: document.pdfKey,
    pdfSize: document.pdfSize,
    pageCount: document.pageCount,
  };
}

/** Reúne todo lo que interviene en el expediente de una solicitud (§8.1). */
@Injectable()
export class SnapshotService {
  constructor(
    private readonly profiles: ProfileService,
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    @InjectRepository(ApplicationMerit) private readonly meritLinks: Repository<ApplicationMerit>,
    @InjectRepository(ApplicationRequirementDocument)
    private readonly requirementLinks: Repository<ApplicationRequirementDocument>,
    @InjectRepository(MeritDocument) private readonly meritDocuments: Repository<MeritDocument>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
  ) {}

  async load(userId: string, applicationId: string): Promise<GenerationSnapshot> {
    const application = await this.applications.findOne({
      where: { id: applicationId, userId },
      relations: { position: true },
    });
    if (!application?.position) throw new NotFoundException('Solicitud no encontrada');

    const [{ updatedAt: _updatedAt, ...profile }, requirementLinks, meritLinks] = await Promise.all(
      [
        this.profiles.get(userId),
        this.requirementLinks.find({
          where: { applicationId },
          relations: { document: true },
          order: { position: 'ASC' },
        }),
        this.meritLinks.find({
          where: { applicationId },
          relations: { merit: true },
          order: { position: 'ASC' },
        }),
      ],
    );

    const meritIds = meritLinks.map((link) => link.meritId);
    const documentLinks = meritIds.length
      ? await this.meritDocuments.find({
          where: { meritId: In(meritIds) },
          relations: { document: true },
          order: { position: 'ASC' },
        })
      : [];
    const idDocument = profile.idDocumentId
      ? await this.documents.findOneBy({ id: profile.idDocumentId, userId })
      : null;

    const merits = meritLinks.flatMap(({ merit }) => {
      if (!merit) return [];
      const def = getMeritType(merit.type);
      const parsed = def.schema.safeParse(merit.data);
      return [
        {
          id: merit.id,
          type: merit.type,
          data: merit.data,
          // Se recalcula por si el catálogo ha cambiado desde que se guardó.
          cvSection: parsed.success ? def.cvSection(parsed.data) : merit.cvSection,
          summary: meritSummary(merit),
          documents: documentLinks
            .filter((link) => link.meritId === merit.id && link.document)
            .map((link) => toSnapshotDocument(link.document!)),
        },
      ];
    });

    return {
      profile,
      idDocument: idDocument && toSnapshotDocument(idDocument),
      position: {
        id: application.position.id,
        code: application.position.code,
        resolutionDate: application.position.resolutionDate,
      },
      applicationDate: application.applicationDate,
      expone: application.expone,
      solicita: application.solicita,
      requirementDocuments: requirementLinks.flatMap((link) =>
        link.document ? [toSnapshotDocument(link.document)] : [],
      ),
      merits: sortByCvSection(merits),
    };
  }
}
