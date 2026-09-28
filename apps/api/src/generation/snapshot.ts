import type {
  CvSectionCode,
  DocumentKind,
  DocumentStatus,
  MeritType,
  ProfileDto,
  ValidationDocument,
  ValidationInput,
} from '@docunex/shared';

export interface SnapshotDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  status: DocumentStatus;
  pdfKey: string | null;
  pdfSize: number | null;
  pageCount: number | null;
}

export interface SnapshotMerit {
  id: string;
  type: MeritType;
  data: Record<string, unknown>;
  cvSection: CvSectionCode;
  summary: string;
  documents: SnapshotDocument[];
}

/**
 * Todo lo que interviene en un expediente, tal como estaba al generarlo. Se guarda con el paquete:
 * editar después el perfil o un mérito no altera lo generado.
 */
export interface GenerationSnapshot {
  profile: Omit<ProfileDto, 'updatedAt'>;
  /** Copia del DNI (bloque 2). */
  idDocument: SnapshotDocument | null;
  position: { id: string; code: string; resolutionDate: string | null };
  applicationDate: string | null;
  expone: string;
  solicita: string;
  /** Bloque 5, en su orden. */
  requirementDocuments: SnapshotDocument[];
  /** Méritos seleccionados en el orden en que se imprimen en el CV. */
  merits: SnapshotMerit[];
}

function toValidationDocument(document: SnapshotDocument): ValidationDocument {
  return {
    id: document.id,
    name: document.name,
    kind: document.kind,
    status: document.status,
    pdfSize: document.pdfSize,
  };
}

export function toValidationInput(snapshot: GenerationSnapshot): ValidationInput {
  return {
    profile: snapshot.profile,
    idDocument: snapshot.idDocument && toValidationDocument(snapshot.idDocument),
    position: snapshot.position,
    applicationDate: snapshot.applicationDate,
    requirementDocuments: snapshot.requirementDocuments.map(toValidationDocument),
    merits: snapshot.merits.map((merit) => ({
      ...merit,
      documents: merit.documents.map(toValidationDocument),
    })),
  };
}
