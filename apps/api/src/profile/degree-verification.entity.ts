import { Column, Entity } from 'typeorm';
import { UserOwnedEntity } from '../common/user-owned.entity.js';

/** Código de verificación de un título universitario; se imprime como QR en la portada del CV. */
@Entity('degree_verifications')
export class DegreeVerification extends UserOwnedEntity {
  @Column({ type: 'varchar', length: 255 })
  degreeName: string;

  /** Código o URL de verificación del Ministerio. */
  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'integer' })
  position: number;
}
