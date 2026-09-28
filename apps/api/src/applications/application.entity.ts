import type { ApplicationStatus } from '@docunex/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, type Relation } from 'typeorm';
import { UserOwnedEntity } from '../common/user-owned.entity.js';
import { Position } from '../positions/position.entity.js';
import { ApplicationMerit } from './application-merit.entity.js';
import { ApplicationRequirementDocument } from './application-requirement-document.entity.js';
import { RegistryEntry } from './registry-entry.entity.js';

@Entity('applications')
export class Application extends UserOwnedEntity {
  @Index()
  @Column('uuid')
  positionId: string;

  /**
   * Una plaza con solicitudes no se puede borrar. Diferida, como `merit_documents`, para que borrar
   * el usuario (que borra en cascada plazas y solicitudes a la vez) funcione.
   */
  @ManyToOne(() => Position, { onDelete: 'NO ACTION', deferrable: 'INITIALLY DEFERRED' })
  @JoinColumn()
  position?: Relation<Position>;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: ApplicationStatus;

  /** Fecha del Anexo III y de la portada del CV. */
  @Column({ type: 'date', nullable: true })
  applicationDate: string | null;

  /** Textos para RedSara. */
  @Column({ type: 'text' })
  expone: string;

  @Column({ type: 'text' })
  solicita: string;

  @OneToMany(() => ApplicationMerit, (link) => link.application)
  merits?: Relation<ApplicationMerit>[];

  @OneToMany(() => ApplicationRequirementDocument, (link) => link.application)
  requirementDocuments?: Relation<ApplicationRequirementDocument>[];

  @OneToMany(() => RegistryEntry, (entry) => entry.application)
  registryEntries?: Relation<RegistryEntry>[];
}
