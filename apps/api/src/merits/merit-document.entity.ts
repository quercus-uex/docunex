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
import { Merit } from './merit.entity.js';

/** Justificante de un mérito. Un documento puede justificar varios méritos. */
@Entity('merit_documents')
export class MeritDocument {
  @PrimaryColumn('uuid')
  meritId: string;

  @PrimaryColumn('uuid')
  @Index()
  documentId: string;

  @ManyToOne(() => Merit, (merit) => merit.documents, { onDelete: 'CASCADE' })
  @JoinColumn()
  merit?: Relation<Merit>;

  /**
   * Un documento en uso no se puede borrar. La comprobación se aplaza al final de la transacción
   * para que borrar el usuario, que borra en cascada méritos y documentos, funcione.
   */
  @ManyToOne(() => Document, { onDelete: 'NO ACTION', deferrable: 'INITIALLY DEFERRED' })
  @JoinColumn()
  document?: Relation<Document>;

  @Column({ type: 'integer' })
  position: number;
}
