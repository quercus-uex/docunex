import type { DocumentKind, DocumentDto, UpdateDocumentInput, UploadResult } from '@docunex/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { type FindOptionsWhere, ILike, Repository } from 'typeorm';
import { isUniqueViolation } from '../common/database-errors.js';
import { JobsService } from '../jobs/jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  NORMALIZE_DOCUMENT_QUEUE,
  type NormalizeDocumentJob,
} from './document-processor.service.js';
import { Document } from './document.entity.js';
import { toDocumentDto } from './document.mapper.js';
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
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
  ) {}

  async list(userId: string, filters: { kind?: DocumentKind; q?: string }): Promise<DocumentDto[]> {
    const base: FindOptionsWhere<Document> = {
      userId,
      ...(filters.kind && { kind: filters.kind }),
    };
    const where = filters.q
      ? [
          { ...base, name: ILike(`%${escapeLike(filters.q)}%`) },
          { ...base, originalFilename: ILike(`%${escapeLike(filters.q)}%`) },
        ]
      : base;
    const documents = await this.documents.find({ where, order: { createdAt: 'DESC' } });
    return documents.map(toDocumentDto);
  }

  async get(userId: string, id: string): Promise<DocumentDto> {
    return toDocumentDto(await this.findOwned(userId, id));
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
    return toDocumentDto(await this.documents.save(document));
  }

  async remove(userId: string, id: string): Promise<void> {
    const document = await this.findOwned(userId, id);
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
    return toDocumentDto(document);
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
    if (existing) return { filename, status: 'duplicate', document: toDocumentDto(existing) };

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
      if (winner) return { filename, status: 'duplicate', document: toDocumentDto(winner) };
      throw error;
    }

    await this.jobs.send<NormalizeDocumentJob>(NORMALIZE_DOCUMENT_QUEUE, {
      documentId: document.id,
    });
    return { filename, status: 'created', document: toDocumentDto(document) };
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
