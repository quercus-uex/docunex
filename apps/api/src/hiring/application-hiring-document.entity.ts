import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Application } from '../applications/application.entity.js';
import { Document } from '../documents/document.entity.js';

/**
 * Documento vinculado a una entrada de la lista de la segunda fase (`HIRING_DOCUMENTS`) de una
 * solicitud. Una entrada puede tener varios (p. ej. el DNI por las dos caras en dos ficheros).
 */
@Entity('application_hiring_documents')
export class ApplicationHiringDocument {
  @PrimaryColumn('uuid')
  applicationId: string;

  /** Clave de la entrada en `HIRING_DOCUMENTS`. */
  @PrimaryColumn({ type: 'varchar', length: 64 })
  requirement: string;

  @PrimaryColumn('uuid')
  @Index()
  documentId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn()
  application?: Relation<Application>;

  /** Como en `application_requirement_documents`: impide borrar el documento mientras esté vinculado. */
  @ManyToOne(() => Document, { onDelete: 'NO ACTION', deferrable: 'INITIALLY DEFERRED' })
  @JoinColumn()
  document?: Relation<Document>;

  @Column({ type: 'integer' })
  position: number;
}
