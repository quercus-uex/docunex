import { describe, expect, it } from 'vitest';
import { MERIT_EXAMPLES } from './merits/examples.js';
import {
  validateApplication,
  type ValidationDocument,
  type ValidationInput,
  type ValidationMerit,
} from './validation.js';

function doc(id: string, overrides: Partial<ValidationDocument> = {}): ValidationDocument {
  return {
    id,
    name: `Documento ${id}`,
    kind: 'certificate',
    status: 'ready',
    pdfSize: 100_000,
    ...overrides,
  };
}

const transcript = doc('certificacion', { kind: 'transcript' });

function merit(overrides: Partial<ValidationMerit> = {}): ValidationMerit {
  return {
    id: 'm1',
    type: 'academic_record',
    data: MERIT_EXAMPLES.academic_record,
    cvSection: '2.a',
    summary: 'Grado (media 8,12)',
    documents: [transcript],
    ...overrides,
  };
}

function input(overrides: Partial<ValidationInput> = {}): ValidationInput {
  return {
    profile: {
      lastNames: 'Fernández Gómez',
      firstName: 'Lucía',
      dni: '12345678Z',
      birthDate: '1995-03-14',
      address: 'C/ Ejemplo, 12',
      postalCode: '10003',
      city: 'Cáceres',
      province: 'Cáceres',
      email: 'lucia@example.com',
      phone: '600000000',
      degree: 'Grado',
      idDocumentId: 'dni',
      degreeVerifications: [],
    },
    idDocument: doc('dni', { kind: 'identity' }),
    position: { code: 'IN123456', resolutionDate: '2026-09-15' },
    applicationDate: '2026-09-28',
    requirementDocuments: [doc('titulo', { kind: 'degree' }), transcript],
    merits: [merit()],
    ...overrides,
  };
}

const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code);

describe('validateApplication', () => {
  it('una solicitud completa no tiene errores ni avisos', () => {
    const result = validateApplication(input());
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    // DNI, título y certificación (compartida con el mérito) cuentan una vez.
    expect(result.sizeEstimate).toBe(300_000 + 3 * 100_000);
  });

  it('exige el perfil completo, la fecha de resolución y la de la solicitud', () => {
    const base = input();
    const result = validateApplication({
      ...base,
      profile: { ...base.profile, phone: null, idDocumentId: null },
      idDocument: null,
      position: { code: 'IN12', resolutionDate: null },
      applicationDate: null,
    });
    expect(codes(result.errors)).toEqual([
      'PROFILE_INCOMPLETE',
      'POSITION_CODE',
      'POSITION_RESOLUTION_DATE',
      'APPLICATION_DATE',
    ]);
    expect(result.errors[0]!.message).toBe('Completa el perfil: falta Teléfono, Copia del DNI.');
  });

  it('exige méritos válidos, con justificantes y documentos procesados', () => {
    const result = validateApplication(
      input({
        requirementDocuments: [doc('titulo', { kind: 'degree', status: 'processing' })],
        merits: [
          merit({ data: { degree: '' } }),
          merit({
            id: 'm2',
            type: 'language',
            data: MERIT_EXAMPLES.language,
            cvSection: '2.f',
            documents: [],
          }),
          merit({
            id: 'm3',
            type: 'language',
            data: MERIT_EXAMPLES.language,
            cvSection: '2.f',
            documents: [doc('roto', { status: 'error' })],
          }),
        ],
      }),
    );
    expect(result.errors.map((issue) => [issue.code, issue.meritId ?? issue.documentId])).toEqual([
      ['DOCUMENT_NOT_READY', 'titulo'],
      ['DOCUMENT_NOT_READY', 'roto'],
      ['MERIT_INVALID', 'm1'],
      ['MERIT_WITHOUT_DOCUMENTS', 'm2'],
    ]);
  });

  it('avisa de bloque 5 vacío, titulación sin acreditar, 2.a sin certificación y apartados de una entrada', () => {
    const result = validateApplication(
      input({
        requirementDocuments: [],
        merits: [
          merit({ documents: [doc('papeleta')] }),
          merit({ id: 'm2', documents: [transcript] }),
        ],
      }),
    );
    expect(codes(result.warnings)).toEqual([
      'ACADEMIC_RECORD_WITHOUT_TRANSCRIPT',
      'SECTION_SINGLE_ENTRY',
      'NO_REQUIREMENT_DOCUMENTS',
      'NO_DEGREE_PROOF',
    ]);
  });

  it('los QR del perfil acreditan la titulación', () => {
    const base = input({ requirementDocuments: [transcript] });
    const result = validateApplication({
      ...base,
      profile: { ...base.profile, degreeVerifications: [{ degreeName: 'Grado', code: 'X' }] },
    });
    expect(codes(result.warnings)).toEqual([]);
  });

  it('avisa si el tamaño estimado supera los 10 MB', () => {
    const result = validateApplication(
      input({ requirementDocuments: [doc('escaneo', { kind: 'degree', pdfSize: 11_000_000 })] }),
    );
    expect(codes(result.warnings)).toEqual(['SIZE_ESTIMATE_OVER_LIMIT']);
    expect(result.warnings[0]!.message).toContain('11,5 MB');
  });
});
