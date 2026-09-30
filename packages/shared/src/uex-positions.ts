import { z } from 'zod';
import { positionCodeSchema } from './positions.js';

/** Página de convocatorias PCI del Servicio de Gestión de Recursos Humanos de Investigación. */
export const UEX_PCI_LISTING_URL =
  'https://rrhhinvestigacion.unex.es/funciones/concursos/convocatorias-pci/';

/** Fase del concurso según el último documento publicado en la web de la UEx. */
export const POSITION_STAGES = ['call', 'firstMinutes', 'secondMinutes'] as const;
export type PositionStage = (typeof POSITION_STAGES)[number];

export const POSITION_STAGE_LABELS: Record<PositionStage, string> = {
  call: 'Convocatoria',
  firstMinutes: 'Acta 1',
  secondMinutes: 'Acta 2',
};

/** Enlaces a los PDF publicados de cada fase (`null` si todavía no se ha publicado). */
export type PositionStageDocuments = Record<PositionStage, string | null>;

/** Fase más avanzada con documento publicado. Sin ninguno, la plaza está en convocatoria. */
export function positionStage(documents: PositionStageDocuments): PositionStage {
  return POSITION_STAGES.findLast((stage) => documents[stage] !== null) ?? 'call';
}

/** Plaza tal y como aparece en la web de la UEx. */
export interface UexPosition {
  code: string;
  department: string | null;
  center: string | null;
  stage: PositionStage;
  documents: PositionStageDocuments;
  /** Columna «Observaciones» (plazos, «RESUELTA»...). */
  observations: string | null;
  /** Fin del plazo de presentación de solicitudes, si viene en las observaciones. */
  deadline: string | null;
}

export interface UexPositionDto extends UexPosition {
  /** Plaza del usuario con este código, si ya la tiene. */
  positionId: string | null;
}

/** Respuesta de `GET /uex-positions`. */
export interface UexPositionListDto {
  source: string;
  fetchedAt: string;
  positions: UexPositionDto[];
}

/** Estado de una plaza del usuario según la última consulta a la web de la UEx. */
export interface PositionUexStatus {
  stage: PositionStage;
  documents: PositionStageDocuments;
  observations: string | null;
  syncedAt: string;
}

/** Cuerpo de `POST /uex-positions/import`. */
export const uexImportSchema = z.object({
  codes: z.array(positionCodeSchema).min(1, 'Elige al menos una plaza').max(100),
});

export type UexImportInput = z.input<typeof uexImportSchema>;
export type UexImportData = z.output<typeof uexImportSchema>;

/** Respuesta de `POST /uex-positions/sync`. */
export interface UexSyncResult {
  /** Plazas encontradas en la web y actualizadas. */
  updated: number;
  /** Plazas del usuario que ya no aparecen en la web. */
  missing: string[];
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Fin del plazo de solicitudes en el texto de «Observaciones», p. ej. «Fin de plazo de presentación
 * de solicitudes: 01 de octubre de 2026» → `2026-10-01`. Otros plazos (reclamaciones) no cuentan.
 */
export function parseApplicationDeadline(observations: string | null): string | null {
  if (!observations) return null;
  const match =
    /presentacion de solicitudes[^:\d]*:?\s*(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/.exec(
      stripAccents(observations).toLowerCase(),
    );
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS.indexOf(monthName!.replace(/^setiembre$/, 'septiembre')) + 1;
  if (month === 0) return null;
  return `${year}-${String(month).padStart(2, '0')}-${day!.padStart(2, '0')}`;
}

const DEPARTMENT_STOPWORDS = new Set([
  'departamento',
  'dpto',
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'y',
  'e',
]);

/**
 * Clave para comparar departamentos escritos de forma distinta: sin tildes, mayúsculas, artículos ni
 * plurales («Dpto. de Ingenierías de Sistemas Informáticos y Telemáticos» = «Ingeniería de sistemas
 * informáticos y telemáticos»).
 */
export function departmentKey(name: string): string {
  return stripAccents(name)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '' && !DEPARTMENT_STOPWORDS.has(word))
    .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))
    .join(' ');
}

export function sameDepartment(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && departmentKey(a) === departmentKey(b);
}
