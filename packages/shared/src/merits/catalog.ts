import type { z } from 'zod';
import type { DocumentKind } from '../documents.js';
import type { CvSectionCode } from './cv-sections.js';
import {
  boolean,
  date,
  decimal,
  type FieldDefs,
  fieldDefs,
  type Fields,
  type FieldsOutput,
  integer,
  list,
  objectSchema,
  onlyIf,
  select,
  text,
  year,
} from './fields.js';

export const MERIT_TYPES = [
  'academic_record',
  'doctoral_studies',
  'doctorate',
  'master',
  'teacher_training',
  'other_degree',
  'language',
  'grant',
  'research_stay',
  'book',
  'book_chapter',
  'article',
  'conference_talk',
  'poster',
  'project',
  'thesis_supervision',
  'art_exhibition',
  'industry_contract',
  'patent',
  'peer_review',
  'professional_activity',
] as const;

export type MeritType = (typeof MERIT_TYPES)[number];

/** Registra un error de validación que afecta a varios campos. */
type AddIssue = (field: string, message: string) => void;

/** Definición de un tipo de mérito: su formulario, su validación y dónde cae en el CV. */
export interface MeritTypeDef<F extends Fields = Fields> {
  type: MeritType;
  label: string;
  /** Ayuda que se muestra al elegir el tipo. */
  description?: string;
  /** Versión del esquema de `data`; se guarda con cada mérito. */
  version: number;
  /** Tipo con el que se clasifican los justificantes subidos desde su formulario. */
  documentKind: DocumentKind;
  /** Apartados en los que puede caer, en orden del CV. */
  sections: readonly CvSectionCode[];
  fields: F;
  /** Metadatos de los campos, para el formulario genérico. */
  fieldDefs: FieldDefs;
  schema: z.ZodType<FieldsOutput<F>>;
  cvSection(data: FieldsOutput<F>): CvSectionCode;
  /** Fecha (ISO) para el orden cronológico por defecto. */
  sortDate(data: FieldsOutput<F>): string | null;
  /** Una línea para listados; también sirve de nombre propuesto para su justificante. */
  summary(data: FieldsOutput<F>): string;
}

interface MeritTypeConfig<F extends Fields> extends Omit<
  MeritTypeDef<F>,
  'type' | 'fieldDefs' | 'schema' | 'version' | 'cvSection' | 'documentKind'
> {
  version?: number;
  documentKind?: DocumentKind;
  cvSection?: (data: FieldsOutput<F>) => CvSectionCode;
  /** Reglas que relacionan varios campos. */
  check?: (data: FieldsOutput<F>, addIssue: AddIssue) => void;
}

function defineMeritType<F extends Fields>(
  type: MeritType,
  config: MeritTypeConfig<F>,
): MeritTypeDef<F> {
  const { check, cvSection, version, documentKind, ...rest } = config;
  const base = objectSchema(config.fields);
  const schema = check
    ? base.superRefine((data, ctx) =>
        check(data, (field, message) => ctx.addIssue({ code: 'custom', message, path: [field] })),
      )
    : base;
  return {
    ...rest,
    type,
    version: version ?? 1,
    documentKind: documentKind ?? 'certificate',
    fieldDefs: fieldDefs(config.fields),
    schema,
    cvSection: cvSection ?? (() => config.sections[0]!),
  };
}

// --- Opciones compartidas ---------------------------------------------------------------------

const SCOPE_OPTIONS = [
  { value: 'national', label: 'Nacional' },
  { value: 'international', label: 'Internacional' },
] as const;

const PROJECT_SCOPE_OPTIONS = [
  { value: 'regional', label: 'Autonómico' },
  { value: 'national', label: 'Nacional' },
  { value: 'international', label: 'Internacional' },
] as const;

export const SCOPE_LABELS: Record<string, string> = Object.fromEntries(
  PROJECT_SCOPE_OPTIONS.map((option) => [option.value, option.label]),
);

const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => ({
  value: level,
  label: level,
}));

// --- Reglas y formatos comunes ----------------------------------------------------------------

function checkDateRange(start: string | null, end: string | null, addIssue: AddIssue) {
  if (start && end && end < start)
    addIssue('endDate', 'La fecha de fin es anterior a la de inicio');
}

const ISBN = /^(?:\d{9}[\dX]|\d{13})$/;

function checkIsbn(isbn: string, addIssue: AddIssue) {
  if (!ISBN.test(isbn.replace(/[\s-]/g, '').toUpperCase())) {
    addIssue('isbn', 'ISBN no válido (10 o 13 dígitos)');
  }
}

/** Une las partes con ". ", sin duplicar el punto si una parte ya termina en signo de puntuación. */
function join(...parts: (string | number | null | undefined)[]): string {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map(String)
    .reduce(
      (text, part) => (text === '' ? part : `${text}${/[.?!]$/.test(text) ? ' ' : '. '}${part}`),
      '',
    );
}

/** Número con coma decimal, para los resúmenes: `8.12` → `8,12`. */
function withComma(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

function yearDate(value: number | null): string | null {
  return value === null ? null : `${value}-01-01`;
}

function gradeCounts() {
  return {
    honors: integer('Nº Matrículas de Honor'),
    outstanding: integer('Nº Sobresalientes'),
    notable: integer('Nº Notables'),
    pass: integer('Nº Aprobados'),
    averageGrade: decimal('Calificación media', { required: true, max: 10 }),
  };
}

function periodFields() {
  return {
    startDate: date('Fecha de inicio', { required: true }),
    endDate: date('Fecha de fin', { help: 'Déjala vacía si sigue en curso.' }),
    months: decimal('Meses', {
      required: true,
      decimals: 1,
      max: 1200,
      monthsBetween: { start: 'startDate', end: 'endDate' },
      help: 'Se calcula a partir de las fechas; puedes corregirlo.',
    }),
  };
}

function presentationFields() {
  return {
    authors: text('Autor/es', { required: true, max: 2000, multiline: true }),
    title: text('Título', { required: true, max: 1000 }),
    congress: text('Congreso', { required: true, span: 8 }),
    scope: select('Carácter', SCOPE_OPTIONS, { required: true }),
    city: text('Ciudad', { required: true, span: 4 }),
    country: text('País', { required: true, span: 4 }),
    year: year('Año', { required: true, span: 4 }),
  };
}

function fundedWorkFields(titleLabel: string) {
  return {
    title: text(titleLabel, { required: true, max: 1000 }),
    scope: select('Carácter', PROJECT_SCOPE_OPTIONS, { required: true }),
    funder: text('Entidad financiadora', { required: true, span: 8 }),
    code: text('Código', { span: 4, max: 100 }),
    startDate: date('Desde', { required: true }),
    endDate: date('Hasta'),
    researchers: integer('Nº de investigadores', { min: 1, max: 1000, span: 4 }),
    principalInvestigator: text('Investigador principal', { required: true }),
  };
}

// --- Catálogo -----------------------------------------------------------------------------------

const academicRecord = defineMeritType('academic_record', {
  documentKind: 'transcript',
  label: 'Nota media del expediente',
  description: 'Titulación de grado o licenciatura con la que accedes a la plaza.',
  sections: ['2.a'],
  fields: {
    degree: text('Titulación', { required: true }),
    ...gradeCounts(),
    nationalAward: boolean('Premio Nacional de Licenciatura o Grado'),
    extraordinaryAward: boolean('Premio Extraordinario de Licenciatura o Grado'),
    tesina: boolean('Tesina'),
  },
  sortDate: () => null,
  summary: (d) => `${d.degree} (media ${withComma(d.averageGrade)})`,
});

const doctoralStudies = defineMeritType('doctoral_studies', {
  documentKind: 'transcript',
  label: 'Cursos de doctorado o máster habilitante',
  sections: ['2.b'],
  fields: {
    qualifyingMaster: text('Máster oficial habilitante'),
    doctoralProgram: text('Programa de doctorado'),
    department: text('Departamento responsable'),
    courses: list(
      'Cursos de doctorado recibidos',
      {
        subject: text('Asignatura', { required: true, span: 6 }),
        credits: decimal('Créditos', { decimals: 1, max: 100 }),
        grade: text('Calificación', { span: 3, max: 50 }),
      },
      { itemLabel: 'curso', max: 40 },
    ),
    averageGrade: decimal('Calificación media doctorado/máster', { max: 10, span: 4 }),
    masterExtraordinaryAward: boolean('Premio Extraordinario fin de Máster'),
  },
  check: (d, addIssue) => {
    if (!d.qualifyingMaster && !d.doctoralProgram) {
      addIssue('qualifyingMaster', 'Indica el máster habilitante o el programa de doctorado');
    }
  },
  sortDate: () => null,
  summary: (d) => d.qualifyingMaster ?? d.doctoralProgram ?? '',
});

const doctorate = defineMeritType('doctorate', {
  documentKind: 'degree',
  label: 'Grado de doctor',
  sections: ['2.c'],
  fields: {
    thesisTitle: text('Título de la tesis', { required: true, max: 1000 }),
    supervisors: text('Director/es', { required: true }),
    defenseDate: date('Fecha de lectura', { required: true, span: 6 }),
    grade: text('Calificación', {
      required: true,
      span: 6,
      placeholder: 'Sobresaliente cum laude',
    }),
    extraordinaryAward: boolean('Premio Extraordinario de Doctorado', { span: 6 }),
    awardDate: onlyIf(
      { field: 'extraordinaryAward', equals: true },
      date('Fecha del acuerdo de concesión', { required: true, span: 6 }),
    ),
    international: boolean('Doctorado Internacional'),
  },
  sortDate: (d) => d.defenseDate,
  summary: (d) => `Doctorado: ${d.thesisTitle}`,
});

const master = defineMeritType('master', {
  documentKind: 'degree',
  label: 'Otro máster no habilitante',
  sections: ['2.d'],
  fields: {
    name: text('Máster', { required: true, span: 9 }),
    credits: decimal('Créditos', { required: true, decimals: 1, max: 300 }),
  },
  sortDate: () => null,
  summary: (d) => `${d.name} (${withComma(d.credits)} créditos)`,
});

const teacherTraining = defineMeritType('teacher_training', {
  label: 'Curso de Adaptación Pedagógica',
  description:
    'CAP o equivalente. No tiene datos: basta con adjuntar el justificante para que se marque "SI".',
  sections: ['2.d'],
  fields: {},
  sortDate: () => null,
  summary: () => 'Curso de Adaptación Pedagógica',
});

const otherDegree = defineMeritType('other_degree', {
  documentKind: 'transcript',
  label: 'Otra titulación',
  sections: ['2.e'],
  fields: {
    degree: text('Titulación', { required: true }),
    ...gradeCounts(),
  },
  sortDate: () => null,
  summary: (d) => `${d.degree} (media ${withComma(d.averageGrade)})`,
});

const language = defineMeritType('language', {
  label: 'Idioma',
  sections: ['2.f'],
  fields: {
    language: text('Idioma', { required: true, span: 4, max: 100 }),
    level: select('Nivel', LANGUAGE_LEVELS, { required: true }),
    certifier: text('Entidad certificadora', { required: true, span: 4 }),
  },
  sortDate: () => null,
  summary: (d) => `${d.language} ${d.level} (${d.certifier})`,
});

const GRANT_KIND_OPTIONS = [
  { value: 'fpu_fpi', label: 'FPU, FPI u otras homologadas por la UEx' },
  { value: 'postdoc', label: 'Postdoctoral' },
  { value: 'other', label: 'Otra beca o contrato de investigación' },
] as const;

const grant = defineMeritType('grant', {
  documentKind: 'grant_credential',
  label: 'Beca o contrato de investigación',
  sections: ['4.a.1', '4.a.2', '4.a.3'],
  fields: {
    kind: select('Tipo', GRANT_KIND_OPTIONS, { required: true, span: 6 }),
    name: text('Beca o contrato', { required: true }),
    organization: text('Organismo', { required: true }),
    ...periodFields(),
  },
  check: (d, addIssue) => checkDateRange(d.startDate, d.endDate, addIssue),
  cvSection: (d) => (({ fpu_fpi: '4.a.1', postdoc: '4.a.2', other: '4.a.3' }) as const)[d.kind],
  sortDate: (d) => d.startDate,
  summary: (d) => `${d.name} (${d.organization})`,
});

const researchStay = defineMeritType('research_stay', {
  label: 'Estancia subvencionada',
  sections: ['4.b'],
  fields: {
    center: text('Centro', { required: true }),
    city: text('Localidad', { required: true, span: 4 }),
    country: text('País', { required: true, span: 4 }),
    year: year('Año', { required: true, span: 2 }),
    months: decimal('Duración (meses)', { required: true, decimals: 1, max: 120, span: 2 }),
  },
  sortDate: (d) => yearDate(d.year),
  summary: (d) => `Estancia en ${d.center} (${d.city}, ${d.year})`,
});

const book = defineMeritType('book', {
  documentKind: 'publication',
  label: 'Libro con ISBN',
  sections: ['4.c.1'],
  fields: {
    title: text('Título', { required: true, max: 1000 }),
    authors: text('Autor/es', { required: true, max: 2000, multiline: true }),
    pages: integer('Número de páginas', { min: 1 }),
    publisher: text('Editorial', { required: true, span: 5 }),
    cityCountry: text('Ciudad/País', { span: 4 }),
    year: year('Año', { required: true }),
    isbn: text('ISBN', { required: true, span: 4, max: 20 }),
    legalDeposit: text('Lugar de depósito', { span: 5 }),
  },
  check: (d, addIssue) => checkIsbn(d.isbn, addIssue),
  sortDate: (d) => yearDate(d.year),
  summary: (d) => join(d.authors, d.year, d.title),
});

const bookChapter = defineMeritType('book_chapter', {
  documentKind: 'publication',
  label: 'Capítulo de libro con ISBN',
  sections: ['4.c.2'],
  fields: {
    chapterTitle: text('Título del capítulo', { required: true, max: 1000 }),
    authors: text('Autor/es', { required: true, max: 2000, multiline: true }),
    firstPage: text('Página inicial', { span: 3, max: 20 }),
    lastPage: text('Página final', { span: 3, max: 20 }),
    bookTitle: text('Título del libro', { required: true, max: 1000 }),
    pages: integer('Número de páginas del libro', { min: 1 }),
    publisher: text('Editorial', { required: true, span: 5 }),
    cityCountry: text('Ciudad/País', { span: 4 }),
    year: year('Año', { required: true }),
    isbn: text('ISBN', { required: true, span: 4, max: 20 }),
    legalDeposit: text('Lugar de depósito', { span: 5 }),
  },
  check: (d, addIssue) => checkIsbn(d.isbn, addIssue),
  sortDate: (d) => yearDate(d.year),
  summary: (d) => join(d.authors, d.year, d.chapterTitle, `En: ${d.bookTitle}`),
});

const INDEX_OPTIONS = [
  { value: 'JCR', label: 'JCR' },
  { value: 'SJR', label: 'SJR' },
  { value: 'Latindex', label: 'Latindex' },
  { value: 'other', label: 'Otro' },
] as const;

const QUARTILE_OPTIONS = [
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' },
  { value: 'not_included', label: 'No incluido' },
] as const;

const DOI = /^10\.\d{4,9}\/\S+$/;

const article = defineMeritType('article', {
  documentKind: 'publication',
  label: 'Artículo en revista científica',
  description:
    'Las ponencias y comunicaciones publicadas en actas de congresos no van aquí, sino como ponencia (4.d).',
  sections: ['4.c.3.a', '4.c.3.b'],
  fields: {
    title: text('Título', { required: true, max: 1000 }),
    authors: text('Autor/es', { required: true, max: 2000, multiline: true }),
    journal: text('Revista o publicación periódica', { required: true }),
    volume: text('Volumen', { span: 4, max: 50 }),
    firstPage: text('Primera página', { span: 4, max: 20 }),
    lastPage: text('Última página', { span: 4, max: 20 }),
    year: year('Año', { required: true }),
    doi: text('DOI', { span: 9, max: 255, placeholder: '10.1000/xyz123' }),
    indexed: boolean('Revista con índice de referencia', { span: 6 }),
    index: onlyIf(
      { field: 'indexed', equals: true },
      select('Índice', INDEX_OPTIONS, { required: true, span: 3 }),
    ),
    otherIndex: onlyIf(
      { field: 'index', equals: 'other' },
      text('Nombre del índice', { required: true, span: 3, max: 100 }),
    ),
    quartile: onlyIf(
      { field: 'indexed', equals: true },
      select('Cuartil', QUARTILE_OPTIONS, { required: true, span: 3 }),
    ),
    category: onlyIf({ field: 'indexed', equals: true }, text('Categoría', { span: 6 })),
    rank: onlyIf(
      { field: 'indexed', equals: true },
      integer('Posición', { min: 1, help: 'En la categoría' }),
    ),
    categoryTotal: onlyIf(
      { field: 'indexed', equals: true },
      integer('Total de revistas', { min: 1, help: 'En la categoría' }),
    ),
  },
  check: (d, addIssue) => {
    if (d.doi && !DOI.test(d.doi)) addIssue('doi', 'DOI no válido (empieza por "10.")');
    if (d.rank !== null && d.categoryTotal !== null && d.rank > d.categoryTotal) {
      addIssue('rank', 'La posición no puede ser mayor que el total');
    }
  },
  cvSection: (d) => (d.indexed ? '4.c.3.a' : '4.c.3.b'),
  sortDate: (d) => yearDate(d.year),
  summary: (d) => join(d.authors, d.year, d.title, d.journal),
});

const conferenceTalk = defineMeritType('conference_talk', {
  label: 'Ponencia o comunicación en congreso',
  sections: ['4.d'],
  fields: presentationFields(),
  sortDate: (d) => yearDate(d.year),
  summary: (d) => join(d.authors, d.year, d.title, d.congress),
});

const poster = defineMeritType('poster', {
  label: 'Panel o póster en congreso',
  sections: ['4.e'],
  fields: presentationFields(),
  sortDate: (d) => yearDate(d.year),
  summary: (d) => join(d.authors, d.year, d.title, d.congress),
});

const project = defineMeritType('project', {
  label: 'Proyecto de investigación',
  sections: ['4.f.1', '4.f.2', '4.f.3'],
  fields: fundedWorkFields('Título del proyecto'),
  check: (d, addIssue) => checkDateRange(d.startDate, d.endDate, addIssue),
  cvSection: (d) =>
    (({ regional: '4.f.1', national: '4.f.2', international: '4.f.3' }) as const)[d.scope],
  sortDate: (d) => d.startDate,
  summary: (d) => join(d.title, d.code ? `${d.funder} (${d.code})` : d.funder),
});

const thesisSupervision = defineMeritType('thesis_supervision', {
  label: 'Dirección de tesis doctoral',
  sections: ['4.g'],
  fields: {
    workTitle: text('Título del trabajo', { required: true, max: 1000 }),
    thesis: text('Tesis doctoral', {
      required: true,
      span: 8,
      help: 'Estado e información de la tesis, p. ej. "Defendida, Sobresaliente cum laude".',
    }),
    defenseDate: date('Fecha de defensa pública'),
    doctoralStudent: text('Doctorando', { required: true }),
  },
  sortDate: (d) => d.defenseDate,
  summary: (d) => `${d.workTitle} (${d.doctoralStudent})`,
});

const artExhibition = defineMeritType('art_exhibition', {
  label: 'Exposición de arte',
  sections: ['4.h'],
  fields: {
    authors: text('Autor/es', { required: true, max: 2000, multiline: true }),
    title: text('Título', { required: true, max: 1000 }),
    participation: select(
      'Tipo de participación',
      [
        { value: 'individual', label: 'Individual' },
        { value: 'collective', label: 'Colectiva' },
      ],
      { required: true },
    ),
    venue: text('Sala', { required: true, span: 8 }),
    city: text('Ciudad', { required: true, span: 4 }),
    country: text('País', { required: true, span: 4 }),
    year: year('Año', { required: true, span: 4 }),
  },
  sortDate: (d) => yearDate(d.year),
  summary: (d) => join(d.title, d.venue, d.year),
});

const industryContract = defineMeritType('industry_contract', {
  documentKind: 'contract',
  label: 'Contrato o convenio con empresas',
  sections: ['4.i'],
  fields: fundedWorkFields('Título del contrato o convenio'),
  check: (d, addIssue) => checkDateRange(d.startDate, d.endDate, addIssue),
  sortDate: (d) => d.startDate,
  summary: (d) => join(d.title, d.funder),
});

const patent = defineMeritType('patent', {
  label: 'Patente en explotación',
  sections: ['4.j'],
  fields: {
    inventors: text('Inventor/es', { required: true, max: 2000, multiline: true }),
    title: text('Título', { required: true, max: 1000 }),
    applicationNumber: text('Nº de solicitud', { required: true, span: 8, max: 100 }),
    date: date('Fecha', { required: true }),
    holder: text('Entidad titular', { required: true }),
    companies: text('Empresa/s que la están o han explotado', { required: true }),
  },
  sortDate: (d) => d.date,
  summary: (d) => `${d.title} (${d.applicationNumber})`,
});

const peerReview = defineMeritType('peer_review', {
  label: 'Revisión para revista indexada',
  sections: ['4.k'],
  fields: {
    journal: text('Revista', { required: true, span: 8 }),
    rank: text('Cuartil o decil', { required: true, span: 4, max: 20, placeholder: 'Q1, D2…' }),
  },
  sortDate: () => null,
  summary: (d) => `Revisor en ${d.journal} (${d.rank})`,
});

const professionalActivity = defineMeritType('professional_activity', {
  documentKind: 'contract',
  label: 'Actividad profesional',
  sections: ['5'],
  fields: {
    activity: text('Tipo de actividad', { required: true }),
    ...periodFields(),
  },
  check: (d, addIssue) => checkDateRange(d.startDate, d.endDate, addIssue),
  sortDate: (d) => d.startDate,
  summary: (d) => d.activity,
});

export const MERIT_CATALOG = {
  academic_record: academicRecord,
  doctoral_studies: doctoralStudies,
  doctorate,
  master,
  teacher_training: teacherTraining,
  other_degree: otherDegree,
  language,
  grant,
  research_stay: researchStay,
  book,
  book_chapter: bookChapter,
  article,
  conference_talk: conferenceTalk,
  poster,
  project,
  thesis_supervision: thesisSupervision,
  art_exhibition: artExhibition,
  industry_contract: industryContract,
  patent,
  peer_review: peerReview,
  professional_activity: professionalActivity,
} as const satisfies Record<MeritType, { type: MeritType }>;

/** Datos (`data`) de un mérito del tipo `T`. */
export type MeritData<T extends MeritType> = z.output<(typeof MERIT_CATALOG)[T]['schema']>;

/** Definición sin tipos concretos, para el código que trata todos los méritos por igual. */
export type AnyMeritTypeDef = MeritTypeDef<Fields>;

export function getMeritType(type: MeritType): AnyMeritTypeDef {
  return MERIT_CATALOG[type] as unknown as AnyMeritTypeDef;
}

export function isMeritType(value: string): value is MeritType {
  return (MERIT_TYPES as readonly string[]).includes(value);
}
