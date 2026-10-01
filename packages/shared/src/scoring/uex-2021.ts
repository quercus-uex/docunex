import type { CommissionFactor, MeritRules, Baremo, BaremoSectionDef } from './types.js';
import {
  bandFromAverage,
  bandFromText,
  countPeople,
  formatPoints,
  GRADE_BAND_LABELS,
  type GradeScale,
  monthsUntil,
  namesApplicant,
  naturalYears,
  normalizeText,
  transcriptPoints,
} from './helpers.js';

/**
 * Baremo del anexo I de la Normativa de contratación del profesorado en régimen laboral de la
 * Universidad de Extremadura 2021 (DOE nº 143, de 27 de julio de 2021), que el artículo 22.1 de la
 * misma normativa aplica al Personal Científico e Investigador (PCI).
 */

// --- Tipos de plaza y ponderaciones (norma segunda del anexo I) --------------------------------

export const POSITION_KINDS = [
  'associate',
  'substitute',
  'assistant',
  'assistant_doctor',
  'contracted_doctor',
  'contracted_doctor_research',
  'pci',
] as const;

export type PositionKind = (typeof POSITION_KINDS)[number];

export const POSITION_KIND_LABELS: Record<PositionKind, string> = {
  associate: 'Profesorado asociado',
  substitute: 'Profesorado sustituto',
  assistant: 'Ayudante',
  assistant_doctor: 'Profesorado ayudante doctor',
  contracted_doctor: 'Profesorado contratado doctor',
  contracted_doctor_research:
    'Profesorado contratado doctor prioritariamente investigador / visitante',
  pci: 'Personal Científico e Investigador (PCI)',
};

/** Apartados del baremo general. */
export const BAREMO_SECTIONS = ['2', '3', '4', '5', '6'] as const;
export type BaremoSectionId = (typeof BAREMO_SECTIONS)[number];

export const BAREMO_SECTION_TITLES: Record<BaremoSectionId, string> = {
  '2': 'Currículum académico',
  '3': 'Currículum docente',
  '4': 'Currículum investigador y transferencia del conocimiento',
  '5': 'Currículum profesional',
  '6': 'Extensión y gestión universitaria',
};

export interface PositionKindWeights {
  /** Factor por el que se multiplica la puntuación de cada apartado. */
  weights: Record<BaremoSectionId, number>;
  /**
   * Mérito preferente: la acreditación para un cuerpo docente en el área incrementa un 20 % la
   * puntuación total ponderada.
   */
  accreditationBonus: boolean;
}

/** Tabla de la norma segunda del anexo I, por tipo de plaza. */
export const UEX_2021_WEIGHTS: Record<PositionKind, PositionKindWeights> = {
  associate: {
    weights: { '2': 0.1, '3': 0.25, '4': 0.1, '5': 0.45, '6': 0.1 },
    accreditationBonus: true,
  },
  substitute: {
    weights: { '2': 0.3, '3': 0.3, '4': 0.2, '5': 0.1, '6': 0.1 },
    accreditationBonus: true,
  },
  assistant: {
    weights: { '2': 0.5, '3': 0.1, '4': 0.2, '5': 0.1, '6': 0.1 },
    accreditationBonus: true,
  },
  assistant_doctor: {
    weights: { '2': 0.1, '3': 0.35, '4': 0.35, '5': 0.1, '6': 0.1 },
    accreditationBonus: true,
  },
  contracted_doctor: {
    weights: { '2': 0.1, '3': 0.35, '4': 0.4, '5': 0.05, '6': 0.1 },
    accreditationBonus: true,
  },
  contracted_doctor_research: {
    weights: { '2': 0.1, '3': 0.1, '4': 0.65, '5': 0.05, '6': 0.1 },
    accreditationBonus: true,
  },
  pci: {
    weights: { '2': 0.15, '3': 0, '4': 0.6, '5': 0.25, '6': 0 },
    accreditationBonus: false,
  },
};

// --- Fuente ------------------------------------------------------------------------------------

export const UEX_2021_SOURCE = {
  title:
    'Anexo I (baremo) de la Normativa de contratación del profesorado en régimen laboral de la UEx 2021',
  reference:
    'Resolución de 21 de julio de 2021, del Rector (DOE nº 143, de 27 de julio de 2021): columna PCI de la norma segunda y apartados 2, 4 y 5 de la norma cuarta.',
  url: 'https://doe.juntaex.es/pdfs/doe/2021/1430o/21062350.pdf',
  notes: [
    {
      text: 'El artículo 22.1 (título IV, Personal Científico e Investigador) remite a los criterios de baremación del anexo I.',
    },
    {
      text: 'La disposición transitoria de la normativa de 2022 (DOE nº 136, de 15 de julio de 2022) mantiene la de 2021 para los PCI.',
      url: 'https://doe.juntaex.es/pdfs/doe/2022/1360o/22062235.pdf',
    },
    {
      text: 'Guía de ayuda para cumplimentar el CV de PCI (Vicerrectorado de Investigación).',
      url: 'https://rrhhinvestigacion.unex.es/wp-content/uploads/sites/58/2024/07/GUIA-AYUDA-CV-PCI.pdf',
    },
  ],
} as const;

export const COMMISSION_FACTOR_LABELS: Record<CommissionFactor, string> = {
  relation:
    'Relación con el área y el perfil de la plaza: puntuación completa si es directa, la mitad si es afín y nada si no guarda relación.',
  publisher_tier: 'Tramo de la editorial, que la comisión fija con el SPI en su primera reunión.',
  journal_index: 'Índice de referencia de las revistas, que elige la comisión para el área.',
  authors: 'Nº de autores: con más de N (el nº medio del área que fija la comisión), × N/n.',
  competitive: 'Que la comisión considere competitiva la convocatoria del proyecto.',
  area: 'Solo se valora en las áreas de arte, arquitectura e ingeniería que indica el baremo.',
};

// --- Reglas por tipo de mérito (norma cuarta) ---------------------------------------------------

/** 2.a) Nota media del expediente. */
const SCALE_2A: GradeScale = { honors: 6, outstanding: 4.5, notable: 3, pass: 1.5 };
/** 2.b) y 2.e) Cursos de doctorado o máster habilitante y otras titulaciones. */
const SCALE_2B: GradeScale = { honors: 2, outstanding: 1.5, notable: 1, pass: 0.5 };

const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const MIN_LANGUAGE_LEVEL = LANGUAGE_LEVELS.indexOf('B1');

const PER_CREDIT_2D = 0.02;

const GRANT_RATES = { fpu_fpi: 1.2, postdoc: 1.2, other: 0.6 } as const;

const PROJECT_RATES = {
  regional: { pi: 0.5, other: 0.25 },
  national: { pi: 1, other: 0.4 },
  international: { pi: 2, other: 0.75 },
} as const;

const ARTICLE_POINTS = { Q1: 2.4, Q2: 1.8, Q3: 1.2, Q4: 0.6 } as const;
const ARTICLE_OUTSIDE_INDEX = 0.3;

const NO_APPLICANT_NOTE =
  'Completa tu nombre en el perfil para saber si eres investigador/a principal; mientras, se puntúa como otro investigador/a.';

function plural(value: number, one: string, many: string): string {
  return `${formatPoints(value)} ${value === 1 ? one : many}`;
}

function extras(parts: [boolean, string, number][]): { points: number; basis: string } {
  const chosen = parts.filter(([applies]) => applies);
  return {
    points: chosen.reduce((total, [, , points]) => total + points, 0),
    basis: chosen.map(([, label, points]) => ` + ${label} ${formatPoints(points)}`).join(''),
  };
}

function role(pi: string, applicantName: string | null) {
  const isPi = namesApplicant(pi, applicantName);
  return {
    isPi,
    label: isPi ? 'IP' : 'otro investigador/a',
    notes: applicantName ? [] : [NO_APPLICANT_NOTE],
  };
}

function presentation(points: { international: number; national: number }) {
  return (d: { scope: 'national' | 'international'; congress: string; year: number }) => {
    const value = points[d.scope];
    return {
      portions: [{ year: d.year, points: value }],
      basis: `${d.scope === 'international' ? 'Internacional' : 'Nacional'}: ${formatPoints(value)}`,
      exclusiveKey: `congress:${normalizeText(d.congress)}:${d.year}`,
    };
  };
}

export const UEX_2021_RULES: MeritRules = {
  academic_record: (d) => {
    const base = transcriptPoints(
      { honors: d.honors, outstanding: d.outstanding, notable: d.notable, pass: d.pass },
      d.averageGrade,
      SCALE_2A,
    );
    const extra = extras([
      [d.nationalAward, 'Premio Nacional', 2],
      [d.extraordinaryAward, 'Premio Extraordinario', 1],
      [d.tesina, 'Tesina', 0.5],
    ]);
    return {
      portions: [{ year: null, points: base.value + extra.points }],
      basis: `Expediente: ${base.basis}${extra.basis}`,
      notes: base.notes,
    };
  },

  doctoral_studies: (d) => {
    const courses = d.courses
      .map((course) => ({ band: bandFromText(course.grade), credits: course.credits ?? 1 }))
      .filter((course) => course.band !== null && course.credits > 0);
    const credits = courses.reduce((total, course) => total + course.credits, 0);
    let value: number;
    let basis: string;
    const notes: string[] = [];
    if (credits > 0) {
      value = courses.reduce((t, c) => t + c.credits * SCALE_2B[c.band!], 0) / credits;
      basis = `media de ${courses.length} cursos por créditos → ${formatPoints(value)}`;
    } else {
      const band = d.averageGrade === null ? null : bandFromAverage(d.averageGrade);
      value = band ? SCALE_2B[band] : 0;
      basis = band
        ? `nota media ${formatPoints(d.averageGrade!)} (${GRADE_BAND_LABELS[band]}) → ${formatPoints(value)}`
        : 'sin calificaciones reconocibles';
      notes.push(
        'Indica la calificación y los créditos de cada curso para calcularlo como el baremo.',
      );
    }
    const extra = extras([[d.masterExtraordinaryAward, 'Premio Extraordinario de Máster', 0.5]]);
    return {
      portions: [{ year: null, points: value + extra.points }],
      basis: `Cursos: ${basis}${extra.basis}`,
      notes,
    };
  },

  doctorate: (d) => {
    const grade = normalizeText(d.grade);
    const notes: string[] = [];
    let value: number;
    let label: string;
    if (d.extraordinaryAward) [value, label] = [6, 'Premio Extraordinario'];
    else if (grade.includes('cum laude')) [value, label] = [5, 'Cum laude'];
    else if (/sobresaliente|\bapto\b/.test(grade)) [value, label] = [3, 'Sobresaliente o Apto'];
    else if (grade.includes('notable')) [value, label] = [2, 'Notable'];
    else if (grade.includes('aprobado')) [value, label] = [1, 'Aprobado'];
    else {
      [value, label] = [5, 'Calificación no reconocida (se toma cum laude)'];
      notes.push('No se reconoce la calificación; se toma la de cum laude como máximo.');
    }
    const extra = extras([[d.international, 'Doctorado Internacional', 0.5]]);
    return {
      portions: [{ year: null, points: value + extra.points }],
      basis: `${label}: ${formatPoints(value)}${extra.basis}`,
      notes,
    };
  },

  master: (d) => ({
    portions: [{ year: null, points: d.credits * PER_CREDIT_2D }],
    basis: `${plural(d.credits, 'crédito', 'créditos')} × ${formatPoints(PER_CREDIT_2D)}`,
  }),

  teacher_training: (d) =>
    d.credits === null
      ? {
          portions: [],
          basis: 'Sin créditos',
          notes: ['Indica sus créditos: el baremo lo puntúa a 0,02 puntos por crédito.'],
        }
      : {
          portions: [{ year: null, points: d.credits * PER_CREDIT_2D }],
          basis: `${plural(d.credits, 'crédito', 'créditos')} × ${formatPoints(PER_CREDIT_2D)}`,
        },

  other_degree: (d) => {
    const base = transcriptPoints(
      { honors: d.honors, outstanding: d.outstanding, notable: d.notable, pass: d.pass },
      d.averageGrade,
      SCALE_2B,
    );
    return {
      portions: [{ year: null, points: base.value }],
      basis: `Expediente: ${base.basis}`,
      notes: [
        ...base.notes,
        'No puntúa si comparte un 40 % o más de los créditos con otra titulación valorada.',
      ],
    };
  },

  language: (d) => {
    const levels = LANGUAGE_LEVELS.indexOf(d.level) - MIN_LANGUAGE_LEVEL + 1;
    const exclusiveKey = `language:${normalizeText(d.language)}`;
    if (levels <= 0) {
      return {
        portions: [],
        basis: `${d.level}: no puntúa`,
        notes: ['Solo puntúa a partir del B1.'],
        exclusiveKey,
      };
    }
    return {
      portions: [{ year: null, points: levels * 0.4 }],
      basis: `${d.level}: ${plural(levels, 'nivel', 'niveles')} desde el B1 × 0,4`,
      exclusiveKey,
    };
  },

  grant: (d, context) => {
    const months = monthsUntil(d.startDate, d.endDate, d.months, context.referenceDate);
    const rate = GRANT_RATES[d.kind];
    return {
      portions: [{ year: null, points: (rate * months) / 12 }],
      basis: `${formatPoints(rate)} por año × ${plural(months, 'mes', 'meses')}`,
    };
  },

  research_stay: (d) =>
    d.months < 1
      ? {
          portions: [],
          basis: 'Menos de un mes',
          notes: ['Solo cuentan las estancias de un mes o más.'],
        }
      : {
          portions: [{ year: d.year, points: 0.2 * d.months }],
          basis: `${plural(d.months, 'mes', 'meses')} × 0,2`,
        },

  book: () => ({
    portions: [{ year: null, points: 4 }],
    basis: 'Autoría, primer tramo SPI: 4 (segundo tramo: 2; edición: 0,5 o 0,25)',
    factors: ['publisher_tier', 'authors'],
  }),

  book_chapter: () => ({
    portions: [{ year: null, points: 1 }],
    basis: 'Primer tramo SPI: 1 (segundo tramo: 0,5)',
    factors: ['publisher_tier', 'authors'],
  }),

  article: (d) => {
    const quartile = d.indexed && d.quartile && d.quartile !== 'not_included' ? d.quartile : null;
    const value = quartile ? ARTICLE_POINTS[quartile] : ARTICLE_OUTSIDE_INDEX;
    return {
      portions: [{ year: null, points: value }],
      basis: quartile ? `${quartile}: ${formatPoints(value)}` : `Fuera del índice: ${value}`,
      factors: ['journal_index', 'authors'],
    };
  },

  conference_talk: presentation({ international: 0.3, national: 0.15 }),

  poster: presentation({ international: 0.15, national: 0.1 }),

  project: (d, context) => {
    const months = monthsUntil(d.startDate, d.endDate, null, context.referenceDate);
    const who = role(d.principalInvestigator, context.applicantName);
    const rate = PROJECT_RATES[d.scope][who.isPi ? 'pi' : 'other'];
    return {
      portions: [{ year: null, points: (rate * months) / 12 }],
      basis: `${who.label}: ${formatPoints(rate)} por año × ${plural(months, 'mes', 'meses')}`,
      factors: ['competitive'],
      notes: who.notes,
    };
  },

  thesis_supervision: (d, context) =>
    d.defenseDate && d.defenseDate <= context.referenceDate
      ? {
          portions: [{ year: null, points: 2 }],
          basis: 'Tesis defendida: 2',
          notes: ['Si es codirigida, los 2 puntos se reparten entre quienes la dirigen.'],
        }
      : {
          portions: [],
          basis: 'Sin defender',
          notes: ['Solo puntúan las tesis ya defendidas: indica la fecha de defensa.'],
        },

  art_exhibition: (d) =>
    d.participation === 'individual'
      ? {
          portions: [{ year: null, points: 1 }],
          basis: 'Individual: 1',
          capKey: 'individual',
          factors: ['area'],
        }
      : {
          portions: [{ year: null, points: 0.5 }],
          basis: 'Colectiva: 0,5',
          capKey: 'collective',
          factors: ['area'],
        },

  industry_contract: (d, context) => {
    const years = naturalYears(d.startDate, d.endDate, context.referenceDate);
    const who = role(d.principalInvestigator, context.applicantName);
    const rate = who.isPi ? 0.25 : 0.1;
    return {
      portions: years.map((year) => ({ year, points: rate })),
      basis: `${who.label}: ${formatPoints(rate)} × ${plural(years.length, 'año natural', 'años naturales')}`,
      notes: who.notes,
    };
  },

  patent: (d) =>
    countPeople(d.inventors) <= 1
      ? { portions: [{ year: null, points: 2 }], basis: 'Individual: 2' }
      : { portions: [{ year: null, points: 1 }], basis: 'Colectiva: 1' },

  peer_review: (d) => ({
    portions: [{ year: null, points: 0.1 }],
    basis: 'Por revista: 0,1',
    exclusiveKey: `review:${normalizeText(d.journal)}`,
  }),

  professional_activity: (d, context) => {
    const months = monthsUntil(d.startDate, d.endDate, d.months, context.referenceDate);
    return {
      portions: [{ year: null, points: (1.2 * months) / 12 }],
      basis: `1,2 por año × ${plural(months, 'mes', 'meses')}`,
      notes: ['A tiempo parcial, en proporción a la dedicación.'],
    };
  },
};

// --- Apartados que valora el PCI (norma cuarta) ------------------------------------------------

const PCI_SECTIONS: readonly BaremoSectionDef[] = [
  {
    id: '2',
    title: BAREMO_SECTION_TITLES['2'],
    weight: UEX_2021_WEIGHTS.pci.weights['2'],
    items: [
      {
        id: '2.a',
        label: '2.a)',
        title: 'Nota media del expediente',
        cvSections: ['2.a'],
        single: true,
        criteria:
          'MH 6; SB 4,5; NT 3; AP 1,5, ponderado por créditos. Premio Nacional +2; Premio Extraordinario +1; tesina o examen de grado +0,5.',
      },
      {
        id: '2.b',
        label: '2.b)',
        title: 'Cursos de doctorado o máster oficial habilitante',
        cvSections: ['2.b'],
        single: true,
        criteria:
          'MH 2; SB 1,5; NT 1; AP 0,5, ponderado por créditos. Premio Extraordinario de Máster +0,5.',
      },
      {
        id: '2.c',
        label: '2.c)',
        title: 'Grado de doctor',
        cvSections: ['2.c'],
        single: true,
        criteria:
          'Premio Extraordinario 6; cum laude 5; Sobresaliente o Apto 3; Notable 2; Aprobado 1. Doctorado internacional +0,5.',
      },
      {
        id: '2.d',
        label: '2.d)',
        title: 'Otros másteres no habilitantes y CAP',
        cvSections: ['2.d'],
        profileIndependent: true,
        caps: [{ max: 2, label: 'Máximo 2 puntos' }],
        criteria: '0,02 puntos por crédito (máximo 2 puntos).',
      },
      {
        id: '2.e',
        label: '2.e)',
        title: 'Otras titulaciones',
        cvSections: ['2.e'],
        profileIndependent: true,
        criteria:
          'Nota media: MH 2; SB 1,5; NT 1; AP 0,5. No puntúa si comparte el 40 % o más de los créditos con otra titulación valorada.',
      },
      {
        id: '2.f',
        label: '2.f)',
        title: 'Conocimiento de idiomas',
        cvSections: ['2.f'],
        profileIndependent: true,
        criteria:
          '0,4 puntos por nivel a partir del B1 con certificación de la EOI u homóloga. Se interpreta como 0,4 por cada nivel desde el B1 (B1 0,4; B2 0,8; C1 1,2; C2 1,6) y un solo certificado por idioma.',
      },
    ],
  },
  {
    id: '4',
    title: BAREMO_SECTION_TITLES['4'],
    weight: UEX_2021_WEIGHTS.pci.weights['4'],
    items: [
      {
        id: '4.a',
        label: '4.a)',
        title: 'Becas y contratos de investigación',
        cvSections: ['4.a.1', '4.a.2', '4.a.3'],
        criteria:
          'FPU, FPI u homologadas 1,2 por año; postdoctorales 1,2 por año; otras 0,6 por año, en proporción al tiempo de disfrute.',
      },
      {
        id: '4.b',
        label: '4.b)',
        title: 'Estancias en centros de investigación',
        cvSections: ['4.b'],
        caps: [{ maxPerYear: 1, label: 'Máximo 1 punto por año' }],
        criteria: '0,2 puntos por mes (mínimo un mes; máximo 1 punto por año).',
      },
      {
        id: '4.c.1',
        label: '4.c.1)',
        title: 'Libros con ISBN',
        cvSections: ['4.c.1'],
        criteria:
          'Primer tramo SPI: autoría 4, edición 0,5; segundo tramo: autoría 2, edición 0,25. Sin autoediciones.',
      },
      {
        id: '4.c.2',
        label: '4.c.2)',
        title: 'Capítulos de libros con ISBN',
        cvSections: ['4.c.2'],
        criteria: 'Primer tramo SPI 1; segundo tramo 0,5.',
      },
      {
        id: '4.c.3',
        label: '4.c.3)',
        title: 'Artículos en revistas científicas',
        cvSections: ['4.c.3.a', '4.c.3.b'],
        criteria: 'Q1 2,4; Q2 1,8; Q3 1,2; Q4 0,6; fuera del índice 0,3.',
      },
      {
        id: '4.d-e',
        label: '4.d-e)',
        title: 'Ponencias, comunicaciones y pósteres en congresos',
        cvSections: ['4.d', '4.e'],
        caps: [
          {
            maxPerYear: 0.75,
            max: 6,
            label: 'Máximo 0,75 puntos por año natural y 6 en total',
          },
        ],
        criteria:
          'Ponencias: internacionales 0,3, nacionales 0,15. Pósteres: internacionales 0,15, nacionales 0,1. Una contribución por congreso.',
      },
      {
        id: '4.f',
        label: '4.f)',
        title: 'Proyectos de investigación competitivos',
        cvSections: ['4.f.1', '4.f.2', '4.f.3'],
        criteria:
          'Por año. Autonómicos: IP 0,5, resto 0,25. Nacionales: IP 1, resto 0,4. Internacionales: IP 2, resto 0,75.',
      },
      {
        id: '4.g',
        label: '4.g)',
        title: 'Dirección de tesis doctorales',
        cvSections: ['4.g'],
        criteria: '2 puntos por tesis defendida, repartidos si es codirigida.',
      },
      {
        id: '4.h',
        label: '4.h)',
        title: 'Exposiciones de arte',
        cvSections: ['4.h'],
        caps: [
          { key: 'individual', max: 4, label: 'Individuales: máximo 4 puntos' },
          { key: 'collective', max: 2, label: 'Colectivas: máximo 2 puntos' },
        ],
        criteria:
          'Solo en áreas de arte, arquitectura e ingeniería: individuales 1 (máximo 4); colectivas 0,5 (máximo 2).',
      },
      {
        id: '4.i',
        label: '4.i)',
        title: 'Contratos y convenios con empresas',
        cvSections: ['4.i'],
        caps: [{ maxPerYear: 0.5, label: 'Máximo 0,5 puntos por año natural' }],
        criteria: 'IP 0,25 por año natural; resto 0,1 (máximo 0,5 por año natural).',
      },
      {
        id: '4.j',
        label: '4.j)',
        title: 'Patentes en explotación',
        cvSections: ['4.j'],
        criteria: 'Individuales 2; colectivas 1.',
      },
      {
        id: '4.k',
        label: '4.k)',
        title: 'Revisiones para revistas indexadas',
        cvSections: ['4.k'],
        caps: [{ max: 1, label: 'Máximo 1 punto' }],
        criteria: '0,1 por revista de las categorías del perfil de la plaza (máximo 1 punto).',
      },
    ],
  },
  {
    id: '5',
    title: BAREMO_SECTION_TITLES['5'],
    weight: UEX_2021_WEIGHTS.pci.weights['5'],
    items: [
      {
        id: '5',
        label: '5.',
        title: 'Actividad profesional',
        cvSections: ['5'],
        caps: [{ max: 18, label: 'Máximo 18 puntos' }],
        criteria:
          '1,2 puntos por año a tiempo completo (proporcional a tiempo parcial); máximo 18 puntos.',
      },
    ],
  },
];

export const PCI_BAREMO: Baremo = {
  id: 'uex-2021-pci',
  positionKind: 'PCI',
  name: 'Baremo PCI de la UEx',
  source: UEX_2021_SOURCE,
  sections: PCI_SECTIONS,
  rules: UEX_2021_RULES,
  factorLabels: COMMISSION_FACTOR_LABELS,
};

/** Baremos disponibles por tipo de plaza. De momento solo el de PCI. */
export const BAREMOS: Partial<Record<PositionKind, Baremo>> = { pci: PCI_BAREMO };

export const DEFAULT_POSITION_KIND: PositionKind = 'pci';

export function getBaremo(kind: PositionKind = DEFAULT_POSITION_KIND): Baremo {
  const baremo = BAREMOS[kind];
  if (!baremo) throw new Error(`No hay baremo para ${POSITION_KIND_LABELS[kind]}`);
  return baremo;
}
