import { z } from 'zod';
import { isoDateSchema, nullableFormat, nullableText } from './common.js';

/** Identificador de una plaza PCI: `IN` + 6 dígitos. */
export const POSITION_CODE_PATTERN = /^IN\d{6}$/;

export const positionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(POSITION_CODE_PATTERN, 'Código de plaza no válido: "IN" y 6 dígitos (IN123456)');

/** Cuerpo de `POST /positions` y `PUT /positions/:id`. */
export const positionInputSchema = z.object({
  code: positionCodeSchema,
  /** Fecha de la resolución de la convocatoria (Anexo III). Obligatoria para generar. */
  resolutionDate: nullableFormat(isoDateSchema),
  title: nullableText(255),
  area: nullableText(255),
  /** Fin del plazo de presentación. */
  deadline: nullableFormat(isoDateSchema),
  notes: nullableText(2000),
});

export type PositionInput = z.input<typeof positionInputSchema>;
export type PositionData = z.output<typeof positionInputSchema>;

export interface PositionDto extends PositionData {
  id: string;
  /** Solicitudes hechas para esta plaza. */
  applications: number;
  createdAt: string;
  updatedAt: string;
}
