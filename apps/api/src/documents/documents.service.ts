import type {
  DocumentDto,
  DocumentKind,
  DocumentUsagesDto,
  UpdateDocumentInput,
  UploadResult,
} from '@docunex/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../common/database-errors.js';
import { ApplicationRequirementDocument } from '../applications/application-requirement-document.entity.js';
import { ApplicationHiringDocument } from '../hiring/application-hiring-document.entity.js';
import { JobsService } from '../jobs/jobs.service.js';
import { MeritDocument } from '../merits/merit-document.entity.js';
import { meritSummary } from '../merits/merit.mapper.js';
import { Profile } from '../profile/profile.entity.js';
import { StorageService } from '../storage/storage.service.js';
import {
  NORMALIZE_DOCUMENT_QUEUE,
  type NormalizeDocumentJob,
} from './document-processor.service.js';
import { Document } from './document.entity.js';
import { type DocumentUsage, toDocumentDto } from './document.mapper.js';
import { detectFileType } from './normalize.js';

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

export interface DocumentFile {
  stream: Readable;
  size: number;
  mime: string;
  filename: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(MeritDocument) private readonly meritLinks: Repository<MeritDocument>,
    @InjectRepository(ApplicationRequirementDocument)
    private readonly requirementLinks: Repository<ApplicationRequirementDocument>,
    @InjectRepository(ApplicationHiringDocument)
    private readonly hiringLinks: Repository<ApplicationHiringDocument>,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
  ) {}

  async list(
    userId: string,
    filters: { kind?: DocumentKind; q?: string; unused?: boolean },
  ): Promise<DocumentDto[]> {
    const query = this.documents
      .createQueryBuilder('document')
      .where('document.userId = :userId', { userId })
      .orderBy('document.createdAt', 'DESC');
    if (filters.kind) query.andWhere('document.kind = :kind', { kind: filters.kind });
    if (filters.q) {
      query.andWhere('(document.name ILIKE :q OR document.originalFilename ILIKE :q)', {
        q: `%${escapeLike(filters.q)}%`,
      });
    }
    if (filters.unused) {
      query
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM merit_documents link WHERE link.document_id = document.id)',
        )
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM application_requirement_documents link WHERE link.document_id = document.id)',
        )
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM application_hiring_documents link WHERE link.document_id = document.id)',
        )
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM profiles profile WHERE profile.id_document_id = document.id)',
        );
    }
    return this.toDtos(userId, await query.getMany());
  }

  async get(userId: string, id: string): Promise<DocumentDto> {
    return this.toDto(userId, await this.findOwned(userId, id));
  }

  /** Méritos y solicitudes que lo usan, y si es la copia del DNI del perfil. */
  async usages(userId: string, id: string): Promise<DocumentUsagesDto> {
    await this.findOwned(userId, id);
    const [links, idDocument, requirementLinks, hiringLinks] = await Promise.all([
      this.meritLinks.find({
        where: { documentId: id },
        relations: { merit: true },
        order: { merit: { cvSection: 'ASC', sortDate: 'DESC' } },
      }),
      this.profiles.existsBy({ userId, idDocumentId: id }),
      this.requirementLinks.find({
        where: { documentId: id },
        relations: { application: { position: true } },
        order: { application: { createdAt: 'DESC' } },
      }),
      this.hiringLinks.find({
        where: { documentId: id },
        relations: { application: { position: true } },
        order: { application: { createdAt: 'DESC' } },
      }),
    ]);
    const hiringApplications = new Map(
      hiringLinks.flatMap(({ application }) =>
        application?.position ? [[application.id, application.position.code] as const] : [],
      ),
    );
    return {
      merits: links.flatMap(({ merit }) =>
        merit
          ? [
              {
                id: merit.id,
                type: merit.type,
                cvSection: merit.cvSection,
                summary: meritSummary(merit),
              },
            ]
          : [],
      ),
      idDocument,
      applications: [
        ...requirementLinks.flatMap(({ application }) =>
          application?.position
            ? [
                {
                  id: application.id,
                  positionCode: application.position.code,
                  role: 'requirement' as const,
                },
              ]
            : [],
        ),
        // Una entrada por solicitud aunque cubra varias entradas de la lista.
        ...[...hiringApplications].map(([applicationId, positionCode]) => ({
          id: applicationId,
          positionCode,
          role: 'hiring' as const,
        })),
      ],
    };
  }

  /** Guarda cada fichero y encola su normalización. Un fichero rechazado no impide los demás. */
  async upload(
    userId: string,
    files: UploadedFile[],
    kind?: DocumentKind,
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      results.push(await this.uploadOne(userId, file, kind));
    }
    return results;
  }

  async update(userId: string, id: string, input: UpdateDocumentInput): Promise<DocumentDto> {
    const document = await this.findOwned(userId, id);
    Object.assign(document, input);
    return this.toDto(userId, await this.documents.save(document));
  }

  /** Borra el documento y sus ficheros. Si lo usa algún mérito o solicitud, `409` con sus usos. */
  async remove(userId: string, id: string): Promise<void> {
    const document = await this.findOwned(userId, id);
    const usages = await this.usages(userId, id);
    if (usages.merits.length > 0 || usages.applications.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        message:
          'El documento está en uso en algún mérito o solicitud: quítalo de ahí antes de borrarlo',
        usages,
      });
    }
    await this.documents.delete(document.id);
    await this.storage.delete(document.originalKey);
    if (document.pdfKey) await this.storage.delete(document.pdfKey);
  }

  async reprocess(userId: string, id: string): Promise<DocumentDto> {
    const document = await this.findOwned(userId, id);
    if (document.status !== 'error') {
      throw new ConflictException('Solo se pueden reprocesar los documentos con error');
    }
    document.status = 'processing';
    document.errorMessage = null;
    await this.documents.save(document);
    await this.jobs.send<NormalizeDocumentJob>(NORMALIZE_DOCUMENT_QUEUE, { documentId: id });
    return this.toDto(userId, document);
  }

  async openFile(userId: string, id: string, variant: 'original' | 'pdf'): Promise<DocumentFile> {
    const document = await this.findOwned(userId, id);
    if (variant === 'original') {
      const { stream, size } = await this.storage.stream(document.originalKey);
      return { stream, size, mime: document.originalMime, filename: document.originalFilename };
    }
    if (!document.pdfKey) {
      throw new ConflictException('El documento todavía no tiene versión PDF');
    }
    const { stream, size } = await this.storage.stream(document.pdfKey);
    return { stream, size, mime: 'application/pdf', filename: `${document.name}.pdf` };
  }

  private async uploadOne(
    userId: string,
    file: UploadedFile,
    kind: DocumentKind | undefined,
  ): Promise<UploadResult> {
    const filename = file.originalname;
    const type = await detectFileType(file.buffer);
    if (!type) {
      return {
        filename,
        status: 'rejected',
        error: 'Formato no admitido: sube un PDF o una imagen (JPG, PNG, TIFF o WebP).',
      };
    }

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.documents.findOneBy({ userId, sha256 });
    if (existing) {
      return { filename, status: 'duplicate', document: await this.toDto(userId, existing) };
    }

    const originalKey = `${userId}/originals/${sha256}.${type.extension}`;
    await this.storage.put(originalKey, file.buffer);

    let document: Document;
    try {
      document = await this.documents.save(
        this.documents.create({
          userId,
          name: defaultName(filename),
          kind: kind ?? 'other',
          originalFilename: filename.slice(0, 255),
          originalMime: type.mime,
          originalSize: file.buffer.length,
          originalKey,
          sha256,
          pdfKey: null,
          pdfSize: null,
          pageCount: null,
          issuedAt: null,
          status: 'processing',
          errorMessage: null,
        }),
      );
    } catch (error) {
      // Dos subidas simultáneas del mismo fichero: gana la primera.
      const winner = isUniqueViolation(error)
        ? await this.documents.findOneBy({ userId, sha256 })
        : null;
      if (winner) {
        return { filename, status: 'duplicate', document: await this.toDto(userId, winner) };
      }
      throw error;
    }

    await this.jobs.send<NormalizeDocumentJob>(NORMALIZE_DOCUMENT_QUEUE, {
      documentId: document.id,
    });
    return { filename, status: 'created', document: toDocumentDto(document) };
  }

  private async toDto(userId: string, document: Document): Promise<DocumentDto> {
    const [dto] = await this.toDtos(userId, [document]);
    return dto!;
  }

  private async toDtos(userId: string, documents: Document[]): Promise<DocumentDto[]> {
    const usage = await this.usageSummaries(userId, documents);
    return documents.map((document) => toDocumentDto(document, usage.get(document.id)));
  }

  private async usageSummaries(
    userId: string,
    documents: Document[],
  ): Promise<Map<string, DocumentUsage>> {
    const ids = documents.map((document) => document.id);
    if (ids.length === 0) return new Map();
    const [counts, requirementCounts, profile] = await Promise.all([
      this.meritLinks
        .createQueryBuilder('link')
        .select('link.documentId', 'documentId')
        .addSelect('COUNT(*)::int', 'merits')
        .where({ documentId: In(ids) })
        .groupBy('link.documentId')
        .getRawMany<{ documentId: string; merits: number }>(),
      // Solicitudes distintas que lo usan, en los requisitos o en la segunda fase.
      this.requirementLinks.manager.query<{ documentId: string; applications: number }[]>(
        `SELECT document_id AS "documentId", COUNT(DISTINCT application_id)::int AS applications
           FROM (SELECT document_id, application_id FROM application_requirement_documents
                 UNION ALL
                 SELECT document_id, application_id FROM application_hiring_documents) link
          WHERE document_id = ANY($1)
          GROUP BY document_id`,
        [ids],
      ),
      this.profiles.findOne({ where: { userId }, select: { userId: true, idDocumentId: true } }),
    ]);
    const meritCounts = new Map(counts.map((row) => [row.documentId, row.merits]));
    const applicationCounts = new Map(
      requirementCounts.map((row) => [row.documentId, row.applications]),
    );
    return new Map(
      ids.map((id) => [
        id,
        {
          merits: meritCounts.get(id) ?? 0,
          applications: applicationCounts.get(id) ?? 0,
          idDocument: profile?.idDocumentId === id,
        },
      ]),
    );
  }

  private async findOwned(userId: string, id: string): Promise<Document> {
    const document = await this.documents.findOneBy({ id, userId });
    if (!document) throw new NotFoundException('Documento no encontrado');
    return document;
  }
}

function defaultName(filename: string): string {
  const name = path.parse(filename).name.trim();
  return (name || 'Documento').slice(0, 255);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
