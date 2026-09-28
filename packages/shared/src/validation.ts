import { MAX_PACKAGE_BYTES } from './applications.js';
import type { DocumentKind, DocumentStatus } from './documents.js';
import { getMeritType, type MeritType } from './merits/catalog.js';
import { type CvSectionCode, getCvSection } from './merits/cv-sections.js';
import { POSITION_CODE_PATTERN } from './positions.js';
import { missingProfileFields, type ProfileData } from './profile.js';

export interface ValidationIssue {
  code: string;
  message: string;
  meritId?: string;
  documentId?: string;
}

/** Documento tal como lo necesitan las reglas. */
export interface ValidationDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  status: DocumentStatus;
  pdfSize: number | null;
}

export interface ValidationMerit {
  id: string;
  type: MeritType;
  data: unknown;
  cvSection: CvSectionCode;
  summary: string;
  documents: ValidationDocument[];
}

export interface ValidationInput {
  profile: Parameters<typeof missingProfileFields>[0] & Pick<ProfileData, 'degreeVerifications'>;
  /** Copia del DNI del perfil. */
  idDocument: ValidationDocument | null;
  position: { code: string; resolutionDate: string | null };
  applicationDate: string | null;
  requirementDocuments: ValidationDocument[];
  /** Méritos seleccionados. */
  merits: ValidationMerit[];
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Tamaño estimado del expediente en bytes. */
  sizeEstimate: number;
  /** Documentos más pesados del expediente, de mayor a menor (presupuesto de tamaño). */
  largestDocuments: { id: string; name: string; size: number }[];
}

/** Cuántos documentos se desglosan en el presupuesto de tamaño. */
const LARGEST_DOCUMENTS = 5;

/** Margen para las partes generadas (Anexo III, CV, hoja índice y separadores). */
const GENERATED_PARTS_BYTES = 300_000;

const DOCUMENT_STATUS_MESSAGES: Partial<Record<DocumentStatus, string>> = {
  processing: 'todavía se está procesando',
  error: 'tiene un error de procesado',
};

/** Reglas de §10 del plan: los errores impiden generar; los avisos, no. */
export function validateApplication(input: ValidationInput): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const missing = missingProfileFields(input.profile);
  if (missing.length > 0) {
    errors.push({
      code: 'PROFILE_INCOMPLETE',
      message: `Completa el perfil: falta ${missing.join(', ')}.`,
    });
  }
  if (!POSITION_CODE_PATTERN.test(input.position.code)) {
    errors.push({
      code: 'POSITION_CODE',
      message: 'El código de la plaza no tiene el formato IN123456.',
    });
  }
  if (!input.position.resolutionDate) {
    errors.push({
      code: 'POSITION_RESOLUTION_DATE',
      message: `Indica la fecha de resolución de la plaza ${input.position.code}.`,
    });
  }
  if (!input.applicationDate) {
    errors.push({ code: 'APPLICATION_DATE', message: 'Indica la fecha de la solicitud.' });
  }

  // Documentos que irán en el expediente, cada uno una vez.
  const documents = new Map<string, ValidationDocument>();
  for (const document of [
    ...(input.idDocument ? [input.idDocument] : []),
    ...input.requirementDocuments,
    ...input.merits.flatMap((merit) => merit.documents),
  ]) {
    documents.set(document.id, document);
  }
  for (const document of documents.values()) {
    const problem = DOCUMENT_STATUS_MESSAGES[document.status];
    if (problem) {
      errors.push({
        code: 'DOCUMENT_NOT_READY',
        message: `El documento "${document.name}" ${problem}.`,
        documentId: document.id,
      });
    }
  }

  for (const merit of input.merits) {
    const def = getMeritType(merit.type);
    if (!def.schema.safeParse(merit.data).success) {
      errors.push({
        code: 'MERIT_INVALID',
        message: `Revisa los datos del mérito "${merit.summary}".`,
        meritId: merit.id,
      });
    }
    if (merit.documents.length === 0) {
      errors.push({
        code: 'MERIT_WITHOUT_DOCUMENTS',
        message: `El mérito "${merit.summary}" no tiene justificantes.`,
        meritId: merit.id,
      });
    }
    if (
      merit.type === 'academic_record' &&
      !merit.documents.some((document) => document.kind === 'transcript')
    ) {
      warnings.push({
        code: 'ACADEMIC_RECORD_WITHOUT_TRANSCRIPT',
        message: `El mérito 2.a "${merit.summary}" no tiene ninguna certificación académica entre sus justificantes.`,
        meritId: merit.id,
      });
    }
  }

  const bySection = new Map<CvSectionCode, number>();
  for (const merit of input.merits) {
    bySection.set(merit.cvSection, (bySection.get(merit.cvSection) ?? 0) + 1);
  }
  for (const [code, count] of bySection) {
    const section = getCvSection(code);
    if (section.single && count > 1) {
      warnings.push({
        code: 'SECTION_SINGLE_ENTRY',
        message: `La plantilla prevé una sola entrada en ${section.label} ${section.title} y hay ${count} seleccionadas.`,
      });
    }
  }

  if (input.merits.length === 0) {
    warnings.push({ code: 'NO_MERITS', message: 'No has seleccionado ningún mérito.' });
  }
  if (input.requirementDocuments.length === 0) {
    warnings.push({
      code: 'NO_REQUIREMENT_DOCUMENTS',
      message:
        'El bloque 5 (documentos justificativos de los requisitos) está vacío: suele llevar el título y la certificación académica.',
    });
  }
  if (
    !input.requirementDocuments.some((document) => document.kind === 'degree') &&
    input.profile.degreeVerifications.length === 0
  ) {
    warnings.push({
      code: 'NO_DEGREE_PROOF',
      message:
        'No hay ningún título en el bloque 5 ni códigos QR de verificación en el perfil: la titulación quedaría sin acreditar.',
    });
  }

  const sizeEstimate =
    GENERATED_PARTS_BYTES +
    [...documents.values()].reduce((total, document) => total + (document.pdfSize ?? 0), 0);
  if (sizeEstimate > MAX_PACKAGE_BYTES) {
    warnings.push({
      code: 'SIZE_ESTIMATE_OVER_LIMIT',
      message: `El expediente ocupará unos ${(sizeEstimate / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB y RedSara admite 10 MB por fichero. Al generarlo se recomprimirán las imágenes de los documentos más pesados.`,
    });
  }
  const largestDocuments = [...documents.values()]
    .map((document) => ({ id: document.id, name: document.name, size: document.pdfSize ?? 0 }))
    .sort((a, b) => b.size - a.size)
    .slice(0, LARGEST_DOCUMENTS);

  return { errors, warnings, sizeEstimate, largestDocuments };
}
