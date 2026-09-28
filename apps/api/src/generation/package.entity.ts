import type { PackageBlockLayout, PackageStatus, ValidationIssue } from '@docunex/shared';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
  Unique,
} from 'typeorm';
import { Application } from '../applications/application.entity.js';
import { UserOwnedEntity } from '../common/user-owned.entity.js';
import type { GenerationSnapshot } from './snapshot.js';
import { PackageDocument } from './package-document.entity.js';

/** Expediente generado (PDF único) de una solicitud. Cada generación crea una versión nueva. */
@Entity('packages')
@Unique(['applicationId', 'version'])
export class Package extends UserOwnedEntity {
  @Index()
  @Column('uuid')
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn()
  application?: Relation<Application>;

  @Column({ type: 'integer' })
  version: number;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  status: PackageStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  progress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey: string | null;

  @Column({ type: 'integer', nullable: true })
  size: number | null;

  @Column({ type: 'integer', nullable: true })
  pageCount: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  layout: PackageBlockLayout[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  errors: ValidationIssue[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  warnings: ValidationIssue[];

  /** Copia de todo lo que se usó para generar: perfil, plaza, textos, méritos y documentos. */
  @Column({ type: 'jsonb', nullable: true })
  snapshot: GenerationSnapshot | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => PackageDocument, (document) => document.package)
  documents?: Relation<PackageDocument>[];
}
