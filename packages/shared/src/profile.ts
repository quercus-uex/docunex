import { z } from 'zod';
import { emailSchema } from './auth.js';
import { isoDateSchema, nullableFormat, nullableText } from './common.js';
import { isValidDni, normalizeDni } from './dni.js';

export const dniSchema = z
  .string()
  .transform(normalizeDni)
  .refine(isValidDni, 'DNI/NIE no válido (comprueba la letra)');

export const degreeVerificationSchema = z.object({
  degreeName: z.string().trim().min(1, 'Indica la titulación').max(255),
  code: z.string().trim().min(1, 'Indica el código o la URL de verificación').max(2000),
});

export const MAX_DEGREE_VERIFICATIONS = 10;

/** Cuerpo de `PUT /profile`. Todos los datos son opcionales para poder guardar el perfil a medias. */
export const profileInputSchema = z.object({
  lastNames: nullableText(150),
  firstName: nullableText(100),
  dni: nullableFormat(dniSchema),
  birthDate: nullableFormat(isoDateSchema),
  address: nullableText(255),
  postalCode: nullableFormat(z.string().regex(/^\d{5}$/, 'Código postal de 5 dígitos')),
  city: nullableText(100),
  province: nullableText(100),
  email: nullableFormat(emailSchema),
  phone: nullableFormat(
    z.string().regex(/^\+?[\d\s]{9,20}$/, 'Teléfono no válido (solo dígitos, espacios y +)'),
  ),
  degree: nullableText(255),
  idDocumentId: z.uuid().nullable(),
  degreeVerifications: z
    .array(degreeVerificationSchema)
    .max(MAX_DEGREE_VERIFICATIONS, `Máximo ${MAX_DEGREE_VERIFICATIONS} titulaciones`),
});

export type ProfileInput = z.input<typeof profileInputSchema>;
export type ProfileData = z.output<typeof profileInputSchema>;

export interface DegreeVerificationDto {
  id: string;
  degreeName: string;
  code: string;
}

export interface ProfileDto extends Omit<ProfileData, 'degreeVerifications'> {
  degreeVerifications: DegreeVerificationDto[];
  updatedAt: string | null;
}

/** Campos del perfil que exige el Anexo III (y la copia del DNI, bloque 2 del expediente). */
export const PROFILE_REQUIRED_FIELDS = {
  lastNames: 'Apellidos',
  firstName: 'Nombre',
  dni: 'DNI/NIE',
  birthDate: 'Fecha de nacimiento',
  address: 'Domicilio',
  postalCode: 'Código postal',
  city: 'Localidad',
  province: 'Provincia',
  email: 'Correo electrónico',
  phone: 'Teléfono',
  degree: 'Titulación',
  idDocumentId: 'Copia del DNI',
} as const satisfies Partial<Record<keyof ProfileData, string>>;

/** Etiquetas de los campos obligatorios que faltan. */
export function missingProfileFields(
  profile: Pick<ProfileData, keyof typeof PROFILE_REQUIRED_FIELDS>,
) {
  return (Object.keys(PROFILE_REQUIRED_FIELDS) as (keyof typeof PROFILE_REQUIRED_FIELDS)[])
    .filter((field) => profile[field] === null)
    .map((field) => PROFILE_REQUIRED_FIELDS[field]);
}
