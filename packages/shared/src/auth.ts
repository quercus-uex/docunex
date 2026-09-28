import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Correo electrónico no válido'));

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Introduce la contraseña'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Usuario autenticado tal como lo expone la API. */
export interface SessionUser {
  id: string;
  email: string;
}
