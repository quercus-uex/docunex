import { Column, Entity, Unique } from 'typeorm';
import { UserOwnedEntity } from '../common/user-owned.entity.js';

/** Plaza PCI a la que se presentan solicitudes. */
@Entity('positions')
@Unique(['userId', 'code'])
export class Position extends UserOwnedEntity {
  /** `IN` + 6 dígitos. */
  @Column({ type: 'varchar', length: 8 })
  code: string;

  @Column({ type: 'date', nullable: true })
  resolutionDate: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area: string | null;

  @Column({ type: 'date', nullable: true })
  deadline: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
