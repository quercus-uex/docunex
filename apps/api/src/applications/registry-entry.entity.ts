import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { UserOwnedEntity } from '../common/user-owned.entity.js';
import { Package } from '../generation/package.entity.js';
import { Application } from './application.entity.js';

/** Asiento registral de una solicitud en RedSara. */
@Entity('registry_entries')
export class RegistryEntry extends UserOwnedEntity {
  @Index()
  @Column('uuid')
  applicationId: string;

  @ManyToOne(() => Application, (application) => application.registryEntries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  application?: Relation<Application>;

  /** Nº de registro que da RedSara. */
  @Column({ type: 'varchar', length: 100 })
  number: string;

  @Column({ type: 'timestamptz' })
  registeredAt: Date;

  /** Asiento principal, si este es complementario o de subsanación (v1.1). */
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => RegistryEntry, { onDelete: 'CASCADE' })
  @JoinColumn()
  parent?: Relation<RegistryEntry> | null;

  /** Expediente presentado. Diferida para que borrar la solicitud (y sus expedientes) funcione. */
  @Index()
  @Column('uuid')
  packageId: string;

  @ManyToOne(() => Package, { onDelete: 'NO ACTION', deferrable: 'INITIALLY DEFERRED' })
  @JoinColumn()
  package?: Relation<Package>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
