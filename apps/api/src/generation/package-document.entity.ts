import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Document } from '../documents/document.entity.js';
import { Package } from './package.entity.js';

/** Numeración `DOC_nn` de un expediente generado: dónde empieza cada documento acreditativo. */
@Entity('package_documents')
export class PackageDocument {
  @PrimaryColumn('uuid')
  packageId: string;

  /** `nn` de `DOC_nn`. */
  @PrimaryColumn('integer')
  code: number;

  @ManyToOne(() => Package, (pkg) => pkg.documents, { onDelete: 'CASCADE' })
  @JoinColumn()
  package?: Relation<Package>;

  /** Se conserva la numeración aunque el documento se borre después. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  documentId: string | null;

  @ManyToOne(() => Document, { onDelete: 'SET NULL' })
  @JoinColumn()
  document?: Relation<Document> | null;

  @Column({ type: 'smallint' })
  block: 5 | 6;

  /** Nombre del documento al generar (el de la hoja índice). */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'integer' })
  startPage: number;

  @Column({ type: 'integer' })
  pageCount: number;

  @Column({ type: 'integer' })
  size: number;
}
