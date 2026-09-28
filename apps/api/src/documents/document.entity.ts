import type { DocumentKind, DocumentStatus } from '@docunex/shared';
import { Column, Entity, Unique } from 'typeorm';
import { UserOwnedEntity } from '../common/user-owned.entity.js';

@Entity('documents')
@Unique(['userId', 'sha256'])
export class Document extends UserOwnedEntity {
  /** Nombre legible; es el que aparece en la hoja índice. */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 32, default: 'other' })
  kind: DocumentKind;

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ type: 'varchar', length: 100 })
  originalMime: string;

  @Column({ type: 'integer' })
  originalSize: number;

  @Column({ type: 'varchar', length: 500 })
  originalKey: string;

  /** Del fichero original, para detectar duplicados. */
  @Column({ type: 'char', length: 64 })
  sha256: string;

  /** Versión normalizada a PDF, la que se ensambla en el expediente. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfKey: string | null;

  @Column({ type: 'integer', nullable: true })
  pdfSize: number | null;

  @Column({ type: 'integer', nullable: true })
  pageCount: number | null;

  @Column({ type: 'date', nullable: true })
  issuedAt: string | null;

  @Column({ type: 'varchar', length: 16, default: 'processing' })
  status: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;
}
