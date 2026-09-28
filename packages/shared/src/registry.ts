import { z } from 'zod';
import { MAX_PACKAGE_BYTES } from './applications.js';
import { nullableText } from './common.js';

/** Datos del registro electrónico, según las instrucciones de la convocatoria PCI. */
export const REDSARA = {
  url: 'https://rec.redsara.es',
  administrationLevel: 'Universidades',
  region: 'Extremadura',
  organism: 'Vicerrectorado de Investigación y Transferencia',
  /** Código DIR3 del organismo, el que figura al pie del Anexo III. */
  organismCode: 'U00200011',
  maxFileBytes: MAX_PACKAGE_BYTES,
  maxTotalBytes: 15 * 1000 * 1000,
  maxFiles: 5,
} as const;

/** Asunto del asiento en RedSara: el código de la plaza. */
export function registrySubject(position: { code: string }): string {
  return position.code;
}

/** Cuerpo de `POST /applications/:id/registry-entries` y `PATCH …/registry-entries/:entryId`. */
export const registryEntryInputSchema = z.object({
  number: z.string().trim().min(1, 'Obligatorio').max(100, 'Máximo 100 caracteres'),
  registeredAt: z.iso.datetime({ offset: true, message: 'Fecha y hora no válidas' }),
  notes: nullableText(2000).optional().default(null),
});

export type RegistryEntryInput = z.input<typeof registryEntryInputSchema>;

/** Estados a los que se puede pasar a mano con `PATCH /applications/:id/status`. */
export const applicationStatusSchema = z.object({
  status: z.enum(['registered', 'closed'], 'Estado no válido'),
});

export interface RegistryEntryDto {
  id: string;
  /** Nº de registro que da RedSara. */
  number: string;
  registeredAt: string;
  notes: string | null;
  /** Expediente que se presentó. */
  packageId: string;
  packageVersion: number;
  createdAt: string;
}
