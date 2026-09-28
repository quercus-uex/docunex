import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Merit } from '../merits/merit.entity.js';
import { Application } from './application.entity.js';

/** Mérito seleccionado en una solicitud. Si se borra el mérito, sale de la selección. */
@Entity('application_merits')
export class ApplicationMerit {
  @PrimaryColumn('uuid')
  applicationId: string;

  @PrimaryColumn('uuid')
  @Index()
  meritId: string;

  @ManyToOne(() => Application, (application) => application.merits, { onDelete: 'CASCADE' })
  @JoinColumn()
  application?: Relation<Application>;

  @ManyToOne(() => Merit, { onDelete: 'CASCADE' })
  @JoinColumn()
  merit?: Relation<Merit>;

  /** Orden manual; dentro de cada apartado del CV se respeta el orden relativo. */
  @Column({ type: 'integer' })
  position: number;
}
