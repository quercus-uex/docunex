import {
  CV_SECTION_CODES,
  getMeritType,
  MERIT_EXAMPLES,
  MERIT_TYPES,
  type MeritData,
  type MeritType,
  PACKAGE_BLOCKS,
} from '@docunex/shared';
import { buildCvModel, type CvMeritInput, type CvModel } from './cv/model.js';
import type {
  AnnexIIIModel,
  Applicant,
  HiringSheetModel,
  IndexSheetModel,
  SeparatorModel,
} from './models.js';

/**
 * Datos de ejemplo para `pnpm templates:preview` y las pruebas. La persona es ficticia.
 */
export const EXAMPLE_APPLICANT: Applicant = {
  lastNames: 'Fernández Gómez',
  firstName: 'Lucía',
  dni: '12345678Z',
  birthDate: '1995-03-14',
  address: 'C/ Ejemplo, 12, 3º B',
  postalCode: '10003',
  city: 'Cáceres',
  province: 'Cáceres',
  email: 'lucia@example.com',
  phone: '600 000 000',
  degree: 'Grado en Ingeniería Informática en Ingeniería del Software',
};

const POSITION_CODE = 'IN123456';
const DATE = '2026-09-28';

export const EXAMPLE_ANNEX: AnnexIIIModel = {
  applicant: EXAMPLE_APPLICANT,
  positionCode: POSITION_CODE,
  resolutionDate: '2026-09-15',
  date: DATE,
};

interface ExampleMerit extends CvMeritInput {
  /** Nombre de cada justificante, para la hoja índice. */
  documents: string[];
}

function merit<T extends MeritType>(
  type: T,
  documents: string[],
  data: Partial<MeritData<T>> = {},
): ExampleMerit {
  const merged = { ...MERIT_EXAMPLES[type], ...data };
  return { type, data: merged, documentIds: documents, documents };
}

/** Al menos un mérito en cada apartado del CV, con variantes que cambian de apartado. */
const FULL_MERITS: ExampleMerit[] = [
  // La certificación académica es a la vez requisito (bloque 5) y justificante del 2.a.
  merit('academic_record', ['Certificación académica personal']),
  ...MERIT_TYPES.filter((type) => type !== 'academic_record').map((type) =>
    merit(type, [`Justificante: ${getMeritType(type).label}`]),
  ),
  merit('master', ['Título: Máster en Ciberseguridad'], {
    name: 'Máster Universitario en Ciberseguridad',
    credits: 90,
  }),
  merit('language', ['Certificado de francés'], {
    language: 'Francés',
    level: 'B2',
    certifier: 'Alliance Française',
  }),
  merit('grant', ['Credencial: contrato postdoctoral'], {
    kind: 'postdoc',
    name: 'Contrato Juan de la Cierva',
    organization: 'Agencia Estatal de Investigación',
    startDate: '2024-10-01',
    endDate: null,
    months: 23.9,
  }),
  merit('grant', ['Credencial: beca de colaboración'], {
    kind: 'other',
    name: 'Beca de colaboración',
    organization: 'Ministerio de Educación',
    startDate: '2017-10-01',
    endDate: '2018-06-30',
    months: 9,
  }),
  merit('article', ['Artículo: revista sin índice'], {
    title: 'Una revisión de planificadores para computación sin servidor',
    journal: 'Revista Española de Informática',
    volume: '12',
    firstPage: '5',
    lastPage: '19',
    year: 2021,
    doi: null,
    indexed: false,
    index: null,
    quartile: null,
    category: null,
    rank: null,
    categoryTotal: null,
  }),
  merit('article', ['Artículo: revista en Latindex'], {
    title: 'Metodologías docentes en asignaturas de sistemas operativos',
    journal: 'Revista de Docencia Universitaria',
    year: 2020,
    doi: null,
    index: 'Latindex',
    quartile: 'not_included',
    category: null,
    rank: null,
    categoryTotal: null,
  }),
  merit('conference_talk', ['Certificado: ponencia CLEI'], {
    title: 'Scheduling serverless workloads at the edge',
    congress: 'Conferencia Latinoamericana de Informática',
    scope: 'international',
    city: 'Montevideo',
    country: 'Uruguay',
    year: 2024,
  }),
  merit('project', ['Resolución: proyecto autonómico'], {
    title: 'Plataforma regional de datos abiertos',
    scope: 'regional',
    funder: 'Junta de Extremadura',
    code: 'IB20000',
    startDate: '2021-01-01',
    endDate: '2023-12-31',
    researchers: 5,
  }),
  // Comparte un justificante con el proyecto nacional: en 4.f se cuenta una sola vez.
  merit('project', ['Resolución: proyecto europeo', 'Justificante: Proyecto de investigación'], {
    title: 'Green computing continuum',
    scope: 'international',
    funder: 'Comisión Europea (Horizonte Europa)',
    code: '101000000',
    startDate: '2023-01-01',
    endDate: '2026-12-31',
    researchers: 25,
  }),
];

/** Apartados y subapartados vacíos a todos los niveles: 2.b–2.e, todo 4.a, 4.f1 y 4.f3, el bloque 5… */
const SPARSE_MERITS: ExampleMerit[] = [
  merit('academic_record', ['Certificación académica personal']),
  merit('language', ['Certificado de inglés']),
  merit('article', ['Artículo: revista sin índice'], {
    indexed: false,
    index: null,
    quartile: null,
    category: null,
    rank: null,
    categoryTotal: null,
  }),
  merit('project', ['Resolución: proyecto nacional']),
];

/** Documentos de requisitos (bloque 5): van antes que los de méritos en la numeración. */
const REQUIREMENT_DOCUMENTS = [
  'Título de Grado en Ingeniería Informática',
  'Certificación académica personal',
];

const sectionOrder = (merit: ExampleMerit) => {
  const def = getMeritType(merit.type);
  return CV_SECTION_CODES.indexOf(def.cvSection(def.schema.parse(merit.data)));
};

/**
 * Numeración simplificada para los ejemplos (la real llega con la generación): primero los requisitos
 * y después los justificantes en el orden del CV; un documento repetido conserva su número.
 */
function numberDocuments(merits: ExampleMerit[]) {
  const ordered = [...merits].sort((a, b) => sectionOrder(a) - sectionOrder(b));
  const codes = new Map<string, number>();
  for (const name of [...REQUIREMENT_DOCUMENTS, ...ordered.flatMap((m) => m.documents)]) {
    if (!codes.has(name)) codes.set(name, codes.size + 1);
  }
  return { ordered, codes };
}

function exampleCv(merits: ExampleMerit[], verifications: CvModel['degreeVerifications']) {
  const { ordered, codes } = numberDocuments(merits);
  return buildCvModel({
    applicant: EXAMPLE_APPLICANT,
    positionCode: POSITION_CODE,
    date: DATE,
    degreeVerifications: verifications,
    merits: ordered,
    docCodes: codes,
  });
}

export const EXAMPLE_CV_FULL: CvModel = exampleCv(FULL_MERITS, [
  {
    degreeName: 'Grado en Ingeniería Informática en Ingeniería del Software',
    code: 'https://www.educacion.gob.es/ruct/consultatitulos?cod=EJEMPLO-GRADO-0001',
  },
  {
    degreeName: 'Máster Universitario en Ingeniería Informática',
    code: 'https://www.educacion.gob.es/ruct/consultatitulos?cod=EJEMPLO-MASTER-0002',
  },
]);

export const EXAMPLE_CV_SPARSE: CvModel = exampleCv(SPARSE_MERITS, []);

/**
 * Hoja índice con los documentos del CV completo y otros tantos inventados, para que ocupe dos páginas.
 */
export const EXAMPLE_INDEX: IndexSheetModel = (() => {
  const { codes } = numberDocuments(FULL_MERITS);
  const names = [...codes.keys()];
  const extra = Array.from({ length: 25 }, (_, i) => `Certificado de asistencia a curso ${i + 1}`);
  let page = 30;
  return {
    applicant: EXAMPLE_APPLICANT,
    positionCode: POSITION_CODE,
    entries: [...names, ...extra].map((name, index) => {
      const entry = {
        code: index + 1,
        name,
        detail: name.startsWith('Justificante: Artículo')
          ? 'JCR, Q1, Computer Science, Theory & Methods (12/143)'
          : null,
        page,
      };
      page += 1 + (index % 4);
      return entry;
    }),
  };
})();

export const EXAMPLE_SEPARATORS: SeparatorModel[] = PACKAGE_BLOCKS.slice(1).map((block) => ({
  number: block.number,
  title: block.title,
}));

/** Portada de la segunda fase: con documentos en casi todas las entradas y una sin aportar. */
export const EXAMPLE_HIRING: HiringSheetModel = {
  applicant: (({ degree: _degree, ...applicant }) => applicant)(EXAMPLE_APPLICANT),
  hiring: {
    iban: 'ES9121000418450200051332',
    socialSecurityNumber: '281234567840',
    nationality: 'Española',
    birthPlace: 'Cáceres',
  },
  positionCode: POSITION_CODE,
  positionTitle: 'Investigador/a en inteligencia artificial',
  registryNumber: 'REGAGE26e00012345678',
  date: DATE,
  entries: [
    {
      label: 'DNI, NIE o pasaporte',
      required: true,
      documents: [
        { name: 'DNI (anverso)', page: 2 },
        { name: 'DNI (reverso)', page: 3 },
      ],
    },
    {
      label: 'Certificado de titularidad de la cuenta bancaria',
      required: true,
      documents: [{ name: 'Certificado de titularidad', page: 4 }],
    },
    { label: 'Modelo 145 del IRPF', required: true, documents: [] },
    { label: 'Autorización de residencia y trabajo', required: false, documents: [] },
  ],
};
