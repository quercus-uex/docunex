import { describe, expect, it } from 'vitest';
import {
  evaluateHiring,
  getHiringDocument,
  HIRING_DOCUMENTS,
  hiringDataInputSchema,
  hiringDocumentKeySchema,
  hiringDocumentsSchema,
} from './hiring.js';

const complete = {
  iban: 'ES9121000418450200051332',
  socialSecurityNumber: '281234567840',
  nationality: 'Española',
};

describe('hiringDataInputSchema', () => {
  it('normaliza el IBAN y el NUSS y convierte las cadenas vacías en null', () => {
    const result = hiringDataInputSchema.parse({
      iban: 'es91 2100 0418 4502 0005 1332',
      socialSecurityNumber: '28/12345678/40',
      nationality: '  ',
      birthPlace: 'Mérida (Badajoz)',
    });
    expect(result).toEqual({
      iban: 'ES9121000418450200051332',
      socialSecurityNumber: '281234567840',
      nationality: null,
      birthPlace: 'Mérida (Badajoz)',
    });
  });

  it('rechaza un IBAN o un NUSS con los dígitos de control mal', () => {
    const result = hiringDataInputSchema.safeParse({
      iban: 'ES9121000418450200051333',
      socialSecurityNumber: '281234567841',
      nationality: null,
      birthPlace: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      'iban',
      'socialSecurityNumber',
    ]);
  });
});

describe('HIRING_DOCUMENTS', () => {
  it('tiene claves únicas y cortas (se guardan en la base de datos)', () => {
    const keys = HIRING_DOCUMENTS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z0-9_]{1,64}$/);
  });

  it('valida las claves', () => {
    expect(hiringDocumentKeySchema.safeParse('bank_account').success).toBe(true);
    expect(hiringDocumentKeySchema.safeParse('otra').success).toBe(false);
    expect(getHiringDocument('irpf_145')?.label).toBe('Modelo 145 del IRPF');
    expect(getHiringDocument('otra')).toBeUndefined();
  });

  it('no admite documentos repetidos', () => {
    const id = '00000000-0000-4000-8000-000000000000';
    expect(hiringDocumentsSchema.safeParse({ documentIds: [id, id] }).success).toBe(false);
  });
});

describe('evaluateHiring', () => {
  const allRequired = Object.fromEntries(
    HIRING_DOCUMENTS.filter((item) => item.required).map((item) => [
      item.key,
      [{ id: `doc-${item.key}`, status: 'ready' as const }],
    ]),
  );

  it('sin nada, faltan los datos y todos los documentos', () => {
    const status = evaluateHiring({
      data: { iban: null, socialSecurityNumber: null, nationality: null },
      documents: {},
    });
    expect(status.complete).toBe(false);
    expect(status.missingData).toEqual([
      'IBAN de la cuenta bancaria',
      'Nº de la Seguridad Social',
      'Nacionalidad',
    ]);
    expect(status.requiredDone).toBe(0);
    expect(status.requiredTotal).toBe(HIRING_DOCUMENTS.filter((item) => item.required).length);
    expect(status.items.every((item) => item.status === 'missing')).toBe(true);
  });

  it('está completa con los datos y los documentos obligatorios, aunque falten los opcionales', () => {
    const status = evaluateHiring({ data: complete, documents: allRequired });
    expect(status.complete).toBe(true);
    expect(status.requiredDone).toBe(status.requiredTotal);
    expect(status.items.find((item) => item.key === 'work_permit')?.status).toBe('missing');
    expect(status.items.find((item) => item.key === 'identity')?.documentIds).toEqual([
      'doc-identity',
    ]);
  });

  it('un documento sin procesar no cuenta como aportado', () => {
    const status = evaluateHiring({
      data: complete,
      documents: {
        ...allRequired,
        bank_account: [
          { id: 'a', status: 'ready' },
          { id: 'b', status: 'processing' },
        ],
      },
    });
    expect(status.items.find((item) => item.key === 'bank_account')?.status).toBe('not_ready');
    expect(status.requiredDone).toBe(status.requiredTotal - 1);
    expect(status.complete).toBe(false);
  });

  it('sin los datos no está completa', () => {
    const status = evaluateHiring({
      data: { ...complete, iban: null },
      documents: allRequired,
    });
    expect(status.complete).toBe(false);
    expect(status.missingData).toEqual(['IBAN de la cuenta bancaria']);
  });
});
