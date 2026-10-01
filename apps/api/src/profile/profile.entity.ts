import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Document } from '../documents/document.entity.js';
import { User } from '../users/user.entity.js';

/**
 * Datos personales del Anexo III y de la contratación (1:1 con el usuario). Todos opcionales hasta
 * generar.
 */
@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid')
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user?: Relation<User>;

  @Column({ type: 'varchar', length: 150, nullable: true })
  lastNames: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 9, nullable: true })
  dni: string | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  /** Texto del campo "Titulación" del Anexo III. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  degree: string | null;

  /** Departamento de la UEx, para filtrar las plazas de la web de la universidad. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string | null;

  /** Copia del DNI (bloque 2 del expediente). */
  @Column({ type: 'uuid', nullable: true })
  idDocumentId: string | null;

  @ManyToOne(() => Document, { onDelete: 'SET NULL' })
  @JoinColumn()
  idDocument?: Relation<Document> | null;

  // Segunda fase (contratación). Se guardan aquí para reutilizarlos en todas las solicitudes.

  /** IBAN normalizado (sin espacios). */
  @Column({ type: 'varchar', length: 34, nullable: true })
  iban: string | null;

  /** Nº de afiliación a la Seguridad Social (NUSS), 12 dígitos. */
  @Column({ type: 'varchar', length: 12, nullable: true })
  socialSecurityNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  birthPlace: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
