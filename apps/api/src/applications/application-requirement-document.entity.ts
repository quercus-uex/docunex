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
import { Application } from './application.entity.js';

/** Documento del bloque 5 (requisitos) de una solicitud. */
@Entity('application_requirement_documents')
export class ApplicationRequirementDocument {
  @PrimaryColumn('uuid')
  applicationId: string;

  @PrimaryColumn('uuid')
  @Index()
  documentId: string;

  @ManyToOne(() => Application, (application) => application.requirementDocuments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  application?: Relation<Application>;

  /** Como en `merit_documents`: impide borrar el documento, salvo al borrar el usuario. */
  @ManyToOne(() => Document, { onDelete: 'NO ACTION', deferrable: 'INITIALLY DEFERRED' })
  @JoinColumn()
  document?: Relation<Document>;

  @Column({ type: 'integer' })
  position: number;
}
