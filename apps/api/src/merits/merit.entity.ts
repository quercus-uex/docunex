import type { CvSectionCode, MeritType } from '@docunex/shared';
import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { UserOwnedEntity } from '../common/user-owned.entity.js';
import { MeritDocument } from './merit-document.entity.js';

@Entity('merits')
export class Merit extends UserOwnedEntity {
  @Column({ type: 'varchar', length: 32 })
  type: MeritType;

  /** Validado con el esquema del catálogo para `type`. */
  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @Column({ type: 'integer' })
  schemaVersion: number;

  /** Derivado de `data` al guardar, para poder filtrar por apartado. */
  @Column({ type: 'varchar', length: 16 })
  cvSection: CvSectionCode;

  /** Derivado de `data` al guardar: orden cronológico por defecto. */
  @Column({ type: 'date', nullable: true })
  sortDate: string | null;

  /** Notas internas; no se imprimen. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => MeritDocument, (link) => link.merit)
  documents?: Relation<MeritDocument>[];
}
