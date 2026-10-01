import { UEX_PCI_LISTING_URL } from '@docunex/shared';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z.stringbool().default(false),
  STORAGE_DIR: z.string().min(1).default('./data/storage'),
  /** Página de convocatorias PCI de la UEx de la que se leen las plazas. */
  UEX_PCI_URL: z.url().default(UEX_PCI_LISTING_URL),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Configuración no válida:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
