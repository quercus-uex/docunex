import { z } from 'zod';
import { nullableFormat, nullableText } from './common.js';
import type { DocumentKind, DocumentStatus } from './documents.js';
import { isValidIban, normalizeIban } from './iban.js';
import { isValidNuss, normalizeNuss } from './nuss.js';

/*
 * Segunda fase de las plazas PCI: si la candidatura resulta seleccionada, hay que aportar los datos y
 * los documentos para formalizar el contrato. Ni la lista de documentos ni los datos salen de una
 * norma concreta: son los habituales en una contratación de la UEx y se pueden ajustar aquí.
 */

export const ibanSchema = z
  .string()
  .transform(normalizeIban)
  .refine(isValidIban, 'IBAN no válido (comprueba los dígitos de control)');

export const nussSchema = z
  .string()
  .transform(normalizeNuss)
  .refine(
    isValidNuss,
    'Número de la Seguridad Social no válido: 12 dígitos con los de control correctos',
  );

/** Cuerpo de `PUT /profile/hiring`: datos para el contrato, guardados en el perfil. */
export const hiringDataInputSchema = z.object({
  /** Cuenta en la que se cobra la nómina. */
  iban: nullableFormat(ibanSchema),
  /** Nº de afiliación a la Seguridad Social (NUSS). */
  socialSecurityNumber: nullableFormat(nussSchema),
  nationality: nullableText(100),
  /** Localidad y provincia (o país) de nacimiento. */
  birthPlace: nullableText(150),
});

export type HiringDataInput = z.input<typeof hiringDataInputSchema>;
export type HiringData = z.output<typeof hiringDataInputSchema>;

export interface HiringDataDto extends HiringData {
  updatedAt: string | null;
}

/** Datos de la segunda fase sin los que la documentación no está completa. */
export const HIRING_REQUIRED_FIELDS = {
  iban: 'IBAN de la cuenta bancaria',
  socialSecurityNumber: 'Nº de la Seguridad Social',
  nationality: 'Nacionalidad',
} as const satisfies Partial<Record<keyof HiringData, string>>;

export function missingHiringFields(data: Pick<HiringData, keyof typeof HIRING_REQUIRED_FIELDS>) {
  return (Object.keys(HIRING_REQUIRED_FIELDS) as (keyof typeof HIRING_REQUIRED_FIELDS)[])
    .filter((field) => data[field] === null)
    .map((field) => HIRING_REQUIRED_FIELDS[field]);
}

export interface HiringDocumentRequirement {
  /** Identificador estable: es lo que se guarda en la base de datos. No lo cambies. */
  key: string;
  label: string;
  description: string;
  /** Si falta, la documentación de la segunda fase no está completa. */
  required: boolean;
  /** Tipos de documento que se proponen primero y el que se asigna al subir uno nuevo. */
  kinds: readonly [DocumentKind, ...DocumentKind[]];
}

/**
 * Documentos de la segunda fase (formalización del contrato), en el orden en que se presentan. Es una
 * lista de trabajo, no oficial: añade, quita o reordena aquí según lo que pida la UEx en cada
 * convocatoria. Quitar una entrada no borra lo que ya estuviera vinculado; simplemente deja de salir.
 */
export const HIRING_DOCUMENTS = [
  {
    key: 'identity',
    label: 'DNI, NIE o pasaporte',
    description: 'Copia por las dos caras, en vigor.',
    required: true,
    kinds: ['identity'],
  },
  {
    key: 'bank_account',
    label: 'Certificado de titularidad de la cuenta bancaria',
    description:
      'Lo emite el banco y acredita que eres titular de la cuenta del IBAN en la que se ingresará la nómina.',
    required: true,
    kinds: ['certificate'],
  },
  {
    key: 'social_security',
    label: 'Documento de afiliación a la Seguridad Social',
    description:
      'Resolución o documento con tu número de afiliación (NUSS). Se obtiene en la sede electrónica de la Seguridad Social.',
    required: true,
    kinds: ['certificate'],
  },
  {
    key: 'degree',
    label: 'Título académico',
    description:
      'Copia del título exigido en la convocatoria (o del resguardo de haberlo solicitado). Si es extranjero, con su homologación o equivalencia.',
    required: true,
    kinds: ['degree'],
  },
  {
    key: 'no_separation',
    label: 'Declaración jurada de no separación ni inhabilitación',
    description:
      'Declaración de no haber sido separado/a del servicio de ninguna Administración Pública ni hallarse inhabilitado/a para el ejercicio de funciones públicas.',
    required: true,
    kinds: ['declaration'],
  },
  {
    key: 'incompatibility',
    label: 'Declaración de incompatibilidades',
    description:
      'Declaración de no desempeñar otro puesto o actividad incompatible (Ley 53/1984), o solicitud de compatibilidad.',
    required: true,
    kinds: ['declaration'],
  },
  {
    key: 'irpf_145',
    label: 'Modelo 145 del IRPF',
    description:
      'Comunicación de datos al pagador (situación personal y familiar) para calcular la retención.',
    required: true,
    kinds: ['declaration'],
  },
  {
    key: 'work_permit',
    label: 'Autorización de residencia y trabajo',
    description: 'Solo si no tienes la nacionalidad de un país de la Unión Europea.',
    required: false,
    kinds: ['identity', 'certificate'],
  },
] as const satisfies readonly HiringDocumentRequirement[];

export type HiringDocumentKey = (typeof HIRING_DOCUMENTS)[number]['key'];

export const HIRING_DOCUMENT_KEYS = HIRING_DOCUMENTS.map((item) => item.key) as [
  HiringDocumentKey,
  ...HiringDocumentKey[],
];

export function getHiringDocument(key: string): HiringDocumentRequirement | undefined {
  return (HIRING_DOCUMENTS as readonly HiringDocumentRequirement[]).find(
    (item) => item.key === key,
  );
}

export const MAX_HIRING_DOCUMENTS_PER_ITEM = 10;

export const hiringDocumentKeySchema = z.enum(
  HIRING_DOCUMENT_KEYS,
  'Documento de la fase 2 no válido',
);

/** Cuerpo de `PUT /applications/:id/hiring/documents/:key`: documentos vinculados, en su orden. */
export const hiringDocumentsSchema = z.object({
  documentIds: z
    .array(z.uuid())
    .max(MAX_HIRING_DOCUMENTS_PER_ITEM, `Máximo ${MAX_HIRING_DOCUMENTS_PER_ITEM} documentos`)
    .refine((ids) => new Set(ids).size === ids.length, 'Hay documentos repetidos'),
});

export type HiringItemStatus = 'missing' | 'not_ready' | 'complete';

export const HIRING_ITEM_STATUS_LABELS: Record<HiringItemStatus, string> = {
  missing: 'Falta',
  not_ready: 'Sin procesar',
  complete: 'Aportado',
};

export interface HiringChecklistItem {
  key: HiringDocumentKey;
  label: string;
  required: boolean;
  documentIds: string[];
  status: HiringItemStatus;
}

export interface HiringStatus {
  items: HiringChecklistItem[];
  /** Etiquetas de los datos obligatorios que faltan. */
  missingData: string[];
  /** Documentos obligatorios aportados y total de obligatorios. */
  requiredDone: number;
  requiredTotal: number;
  /** Datos completos y todos los documentos obligatorios aportados y procesados. */
  complete: boolean;
}

/** Estado de la lista de comprobación a partir de los datos y los documentos vinculados. */
export function evaluateHiring(input: {
  data: Pick<HiringData, keyof typeof HIRING_REQUIRED_FIELDS>;
  /** Documentos vinculados a cada entrada, con su estado de procesado. */
  documents: Partial<Record<string, { id: string; status: DocumentStatus }[]>>;
}): HiringStatus {
  const items = HIRING_DOCUMENTS.map((item): HiringChecklistItem => {
    const documents = input.documents[item.key] ?? [];
    return {
      key: item.key,
      label: item.label,
      required: item.required,
      documentIds: documents.map((document) => document.id),
      status:
        documents.length === 0
          ? 'missing'
          : documents.every((document) => document.status === 'ready')
            ? 'complete'
            : 'not_ready',
    };
  });
  const required = items.filter((item) => item.required);
  const requiredDone = required.filter((item) => item.status === 'complete').length;
  const missingData = missingHiringFields(input.data);
  return {
    items,
    missingData,
    requiredDone,
    requiredTotal: required.length,
    complete: missingData.length === 0 && requiredDone === required.length,
  };
}

/** Segunda fase de una solicitud (`GET /applications/:id/hiring`). */
export interface HiringDto {
  applicationId: string;
  /** Se puede modificar mientras la solicitud está registrada (no cerrada). */
  editable: boolean;
  data: HiringDataDto;
  status: HiringStatus;
}

/** Resumen para la lista de solicitudes. */
export type HiringSummaryDto = Pick<HiringStatus, 'requiredDone' | 'requiredTotal' | 'complete'>;
