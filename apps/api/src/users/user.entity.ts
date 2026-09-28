import { Column, Entity } from 'typeorm';
import { TimestampedEntity } from '../common/timestamped.entity.js';

@Entity('users')
export class User extends TimestampedEntity {
  @Column({ type: 'varchar', length: 320, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;
}
