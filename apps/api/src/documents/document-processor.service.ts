import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobsService } from '../jobs/jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { Document } from './document.entity.js';
import { DocumentProcessingError, imageToPdf, normalizePdf } from './normalize.js';

export const NORMALIZE_DOCUMENT_QUEUE = 'document.normalize';

export interface NormalizeDocumentJob {
  documentId: string;
}

/** Worker que convierte cada documento subido en su versión PDF normalizada. */
@Injectable()
export class DocumentProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.jobs.work<NormalizeDocumentJob>(
      NORMALIZE_DOCUMENT_QUEUE,
      ({ documentId }) => this.process(documentId),
      { concurrency: 2 },
    );
  }

  async process(documentId: string): Promise<void> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document || document.status !== 'processing') return;

    try {
      const original = await this.storage.read(document.originalKey);
      const { pdf, pageCount } =
        document.originalMime === 'application/pdf'
          ? await normalizePdf(original)
          : await imageToPdf(original);

      const pdfKey = `${document.userId}/pdf/${document.id}.pdf`;
      await this.storage.put(pdfKey, pdf);
      await this.documents.update(document.id, {
        status: 'ready',
        pdfKey,
        pdfSize: pdf.length,
        pageCount,
        errorMessage: null,
      });
    } catch (error) {
      const expected = error instanceof DocumentProcessingError;
      if (!expected) this.logger.error(`Documento ${document.id}`, (error as Error).stack);
      await this.documents.update(document.id, {
        status: 'error',
        errorMessage: expected
          ? error.message
          : 'Error inesperado al procesar el documento. Prueba a reprocesarlo.',
      });
    }
  }
}
