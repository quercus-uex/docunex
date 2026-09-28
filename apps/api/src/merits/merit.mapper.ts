import { getMeritType, type MeritDto } from '@docunex/shared';
import type { Merit } from './merit.entity.js';

/** Resumen de una línea. Si `data` no encaja con el esquema actual, el nombre del tipo. */
export function meritSummary(merit: Pick<Merit, 'type' | 'data'>): string {
  const def = getMeritType(merit.type);
  const result = def.schema.safeParse(merit.data);
  return result.success ? def.summary(result.data) : def.label;
}

/** `merit.documents` debe venir cargado con su `document` y ordenado por `position`. */
export function toMeritDto(merit: Merit): MeritDto {
  return {
    id: merit.id,
    type: merit.type,
    data: merit.data,
    schemaVersion: merit.schemaVersion,
    cvSection: merit.cvSection,
    sortDate: merit.sortDate,
    summary: meritSummary(merit),
    notes: merit.notes,
    documents: (merit.documents ?? []).flatMap(({ document }) =>
      document
        ? [
            {
              id: document.id,
              name: document.name,
              kind: document.kind,
              status: document.status,
              pageCount: document.pageCount,
            },
          ]
        : [],
    ),
    createdAt: merit.createdAt.toISOString(),
    updatedAt: merit.updatedAt.toISOString(),
  };
}
