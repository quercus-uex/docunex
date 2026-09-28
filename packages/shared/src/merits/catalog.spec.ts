import { describe, expect, it } from 'vitest';
import { meritInputSchema } from './api.js';
import { getMeritType, MERIT_CATALOG, MERIT_TYPES, type MeritType } from './catalog.js';
import { CV_LEAF_SECTIONS } from './cv-sections.js';
import { MERIT_EXAMPLES } from './examples.js';
import { emptyFormValues, monthsBetween, optionLabel, toFormValues } from './fields.js';

function parse(type: MeritType, data: Record<string, unknown>) {
  return getMeritType(type).schema.safeParse(data);
}

function issues(type: MeritType, data: Record<string, unknown>) {
  const result = parse(type, data);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

function example(type: MeritType): Record<string, unknown> {
  return { ...MERIT_EXAMPLES[type] };
}

const leafCodes = CV_LEAF_SECTIONS.map((section) => section.code);

describe('catálogo de méritos', () => {
  it('define los 21 tipos, cada uno con su clave', () => {
    expect(MERIT_TYPES).toHaveLength(21);
    for (const type of MERIT_TYPES) expect(MERIT_CATALOG[type].type).toBe(type);
  });

  it.each(MERIT_TYPES)('%s: acepta su ejemplo y cae en uno de sus apartados', (type) => {
    const def = getMeritType(type);
    const result = def.schema.safeParse(MERIT_EXAMPLES[type]);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    const data = result.data!;
    expect(def.sections).toContain(def.cvSection(data));
    for (const section of def.sections) expect(leafCodes).toContain(section);
    expect(def.summary(data)).not.toBe('');
    const sortDate = def.sortDate(data);
    if (sortDate !== null) expect(sortDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(MERIT_TYPES)(
    '%s: el formulario vacío solo es válido si el tipo no tiene campos obligatorios',
    (type) => {
      const def = getMeritType(type);
      const result = def.schema.safeParse(emptyFormValues(def.fieldDefs));
      const hasRequired = Object.values(def.fieldDefs).some(
        (field) => field.required && !field.when,
      );
      expect(result.success).toBe(!hasRequired && type !== 'doctoral_studies');
    },
  );

  it.each(MERIT_TYPES)('%s: los datos guardados vuelven al formulario sin perder nada', (type) => {
    const def = getMeritType(type);
    const data = def.schema.parse(MERIT_EXAMPLES[type]);
    expect(def.schema.parse(toFormValues(def.fieldDefs, data))).toEqual(data);
  });

  it('cada apartado hoja del CV recibe méritos de algún tipo', () => {
    const covered = new Set(MERIT_TYPES.flatMap((type) => getMeritType(type).sections));
    expect([...covered].sort()).toEqual([...leafCodes].sort());
  });
});

describe('campos', () => {
  it('marca como obligatorios los campos vacíos y convierte los opcionales vacíos en null', () => {
    expect(issues('language', { language: ' ', level: null, certifier: '' })).toEqual({
      language: 'Obligatorio',
      level: 'Obligatorio',
      certifier: 'Obligatorio',
    });
    const result = parse('book', { ...example('book'), cityCountry: '  ', legalDeposit: '' });
    expect(result.data).toMatchObject({ cityCountry: null, legalDeposit: null });
  });

  it('acepta que falten los campos opcionales y descarta los desconocidos', () => {
    const { pages: _pages, legalDeposit: _deposit, ...rest } = example('book');
    const result = parse('book', { ...rest, unknown: 'x' });
    expect(result.data).toMatchObject({ pages: null, legalDeposit: null });
    expect(result.data).not.toHaveProperty('unknown');
  });

  it('valida números, fechas y selects', () => {
    expect(
      issues('research_stay', { ...example('research_stay'), year: 1800, months: -1 }),
    ).toEqual({ year: 'Año no válido', months: 'Mínimo 0' });
    expect(issues('language', { ...example('language'), level: 'Z9' })).toEqual({
      level: 'Opción no válida',
    });
    expect(issues('patent', { ...example('patent'), date: '2023-13-40' })).toEqual({
      date: 'Fecha no válida',
    });
    expect(issues('master', { ...example('master'), credits: 60.25 })).toEqual({
      credits: 'Máximo 1 decimales',
    });
  });

  it('las casillas no marcadas son false', () => {
    const { tesina: _tesina, ...rest } = example('academic_record');
    expect(parse('academic_record', rest).data).toMatchObject({ tesina: false });
  });

  it('da la etiqueta de la opción elegida en un select', () => {
    const { fieldDefs } = getMeritType('article');
    expect(optionLabel(fieldDefs, 'quartile', 'not_included')).toBe('No incluido');
    expect(optionLabel(fieldDefs, 'quartile', null)).toBe('');
    expect(optionLabel(fieldDefs, 'title', 'Texto libre')).toBe('Texto libre');
  });
});

describe('reglas de cada tipo', () => {
  it('article: va a 4.c.3.a con índice (cuartil obligatorio) y a 4.c.3.b sin él', () => {
    const def = getMeritType('article');
    expect(issues('article', { ...example('article'), quartile: null })).toEqual({
      quartile: 'Obligatorio',
    });

    const unindexed = def.schema.parse({ ...example('article'), indexed: false, quartile: null });
    expect(def.cvSection(unindexed)).toBe('4.c.3.b');
    // Los datos del índice se descartan si la revista no está indexada.
    expect(unindexed).toMatchObject({ index: null, quartile: null, rank: null, category: null });
    expect(def.cvSection(def.schema.parse(example('article')))).toBe('4.c.3.a');
  });

  it('article: pide el nombre del índice si es "otro" y comprueba posición y DOI', () => {
    expect(issues('article', { ...example('article'), index: 'other', otherIndex: '' })).toEqual({
      otherIndex: 'Obligatorio',
    });
    expect(issues('article', { ...example('article'), rank: 200, doi: 'doi.org/10.1/x' })).toEqual({
      rank: 'La posición no puede ser mayor que el total',
      doi: 'DOI no válido (empieza por "10.")',
    });
  });

  it('doctorate: la fecha del acuerdo solo se exige con premio extraordinario', () => {
    expect(issues('doctorate', { ...example('doctorate'), awardDate: null })).toEqual({
      awardDate: 'Obligatorio',
    });
    const result = parse('doctorate', { ...example('doctorate'), extraordinaryAward: false });
    expect(result.data).toMatchObject({ awardDate: null });
  });

  it('grant y project: el apartado depende del tipo y del ámbito', () => {
    const grant = getMeritType('grant');
    const kinds = { fpu_fpi: '4.a.1', postdoc: '4.a.2', other: '4.a.3' };
    for (const [kind, section] of Object.entries(kinds)) {
      expect(grant.cvSection(grant.schema.parse({ ...example('grant'), kind }))).toBe(section);
    }
    const project = getMeritType('project');
    const scopes = { regional: '4.f.1', national: '4.f.2', international: '4.f.3' };
    for (const [scope, section] of Object.entries(scopes)) {
      expect(project.cvSection(project.schema.parse({ ...example('project'), scope }))).toBe(
        section,
      );
    }
  });

  it('los periodos no pueden terminar antes de empezar', () => {
    for (const type of [
      'grant',
      'project',
      'industry_contract',
      'professional_activity',
    ] as const) {
      expect(issues(type, { ...example(type), endDate: '2000-01-01' })).toEqual({
        endDate: 'La fecha de fin es anterior a la de inicio',
      });
    }
  });

  it('book y book_chapter: validan el ISBN', () => {
    expect(issues('book', { ...example('book'), isbn: '12345' })).toEqual({
      isbn: 'ISBN no válido (10 o 13 dígitos)',
    });
    expect(parse('book', { ...example('book'), isbn: '84-376-0494-X' }).success).toBe(true);
    expect(issues('book_chapter', { ...example('book_chapter'), isbn: 'abc' })).toHaveProperty(
      'isbn',
    );
  });

  it('doctoral_studies: exige el máster o el programa y valida cada curso', () => {
    expect(
      issues('doctoral_studies', {
        ...example('doctoral_studies'),
        qualifyingMaster: '',
        doctoralProgram: null,
        courses: [{ subject: '', credits: 3, grade: '' }],
      }),
    ).toEqual({
      'courses.0.subject': 'Obligatorio',
      qualifyingMaster: 'Indica el máster habilitante o el programa de doctorado',
    });
  });

  it('sortDate usa el año o la fecha del mérito', () => {
    const article = getMeritType('article');
    expect(article.sortDate(article.schema.parse(example('article')))).toBe('2024-01-01');
    const grant = getMeritType('grant');
    expect(grant.sortDate(grant.schema.parse(example('grant')))).toBe('2020-10-01');
  });
});

describe('summary', () => {
  it('no duplica el punto tras las iniciales de los autores', () => {
    const article = getMeritType('article');
    expect(article.summary(article.schema.parse(example('article')))).toBe(
      'Ruiz, I.; Martín, L.; Pérez, A. 2024. Energy-aware scheduling in heterogeneous clouds. Future Generation Computer Systems',
    );
  });
});

describe('meritInputSchema', () => {
  const input = { type: 'language', data: example('language'), notes: '', documentIds: [] };

  it('valida data con el esquema de su tipo y antepone "data" a la ruta de los errores', () => {
    expect(meritInputSchema.parse(input)).toMatchObject({ notes: null, data: example('language') });
    const result = meritInputSchema.safeParse({ ...input, data: { language: 'Inglés' } });
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'data.level',
      'data.certifier',
    ]);
  });

  it('rechaza tipos desconocidos y documentos repetidos', () => {
    expect(meritInputSchema.safeParse({ ...input, type: 'award' }).success).toBe(false);
    const id = '0b6f3a4e-8d1c-4f51-9d0a-4f5b2c1e7a90';
    const result = meritInputSchema.safeParse({ ...input, documentIds: [id, id] });
    expect(result.error?.issues[0]?.message).toBe('Hay documentos repetidos');
  });
});

describe('monthsBetween', () => {
  it('cuenta los meses con ambos extremos incluidos', () => {
    expect(monthsBetween('2020-10-01', '2024-09-30')).toBe(48);
    expect(monthsBetween('2023-01-01', '2023-03-31')).toBe(3);
    expect(monthsBetween('2023-01-01', '2023-01-15')).toBe(0.5);
  });

  it('devuelve null si falta una fecha o el orden es incorrecto', () => {
    expect(monthsBetween('2023-01-01', null)).toBeNull();
    expect(monthsBetween('2023-02-01', '2023-01-01')).toBeNull();
  });
});
