import { Column, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { User } from '../users/user.entity.js';
import { TimestampedEntity } from './timestamped.entity.js';

/** Entidad que pertenece a un usuario; se borra con él. */
export abstract class UserOwnedEntity extends TimestampedEntity {
  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user?: Relation<User>;
}
