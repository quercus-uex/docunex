/** Apartados del CV normalizado de la UEx (`referencias/Plantilla_CV.doc`), en orden de impresión. */
export const CV_SECTION_CODES = [
  '2',
  '2.a',
  '2.b',
  '2.c',
  '2.d',
  '2.e',
  '2.f',
  '4',
  '4.a',
  '4.a.1',
  '4.a.2',
  '4.a.3',
  '4.b',
  '4.c',
  '4.c.1',
  '4.c.2',
  '4.c.3',
  '4.c.3.a',
  '4.c.3.b',
  '4.d',
  '4.e',
  '4.f',
  '4.f.1',
  '4.f.2',
  '4.f.3',
  '4.g',
  '4.h',
  '4.i',
  '4.j',
  '4.k',
  '5',
] as const;

export type CvSectionCode = (typeof CV_SECTION_CODES)[number];

export interface CvSectionDef {
  code: CvSectionCode;
  /** Numeración tal como se imprime: `2.-`, `4.a.1)`, `a)`, `4.f1)`. */
  label: string;
  /** Título literal de la plantilla. */
  title: string;
  parent: CvSectionCode | null;
  /**
   * Dónde va el "Doc. nº": una vez para todo el apartado (`section`, incluidos sus subapartados),
   * en cada entrada (`entry`) o en ningún sitio de este nivel (`null`).
   */
  docRef: 'section' | 'entry' | null;
  /**
   * Notas literales de la plantilla. Las que van entre paréntesis se imprimen bajo el título; las demás,
   * en un recuadro "Nota:" al final del apartado. Marcas de énfasis: `**negrita**` y `*cursiva*`.
   */
  notes: readonly string[];
  /** La plantilla solo prevé una entrada. */
  single: boolean;
}

type SectionInput = Pick<CvSectionDef, 'code' | 'label' | 'title'> &
  Partial<Pick<CvSectionDef, 'docRef' | 'notes' | 'single'>>;

function sections(parent: CvSectionCode | null, ...items: SectionInput[]): CvSectionDef[] {
  return items.map((item) => ({ docRef: null, notes: [], single: false, ...item, parent }));
}

const TRANSCRIPT_NOTE =
  'Se acompañará a este *Currículum vitae* **Certificación** con el Expediente Académico detallado.';

export const CV_SECTIONS: readonly CvSectionDef[] = [
  ...sections(null, { code: '2', label: '2.-', title: 'CURRÍCULUM ACADÉMICO' }),
  ...sections(
    '2',
    {
      code: '2.a',
      label: '2.a)',
      title: 'Nota Media del Expediente',
      docRef: 'section',
      single: true,
      notes: [
        TRANSCRIPT_NOTE,
        'Se acompañará a este *Currículum vitae* **a)** fotocopia de la papeleta con la calificación o Certificación del Centro, **b)** si fuera Premio Extraordinario, certificación del Centro donde quede reflejada la fecha en la que se tomó el acuerdo y **c)** si fuera Premio Nacional, certificado de concesión del premio.',
      ],
    },
    {
      code: '2.b',
      label: '2.b)',
      title:
        'Nota media en cursos de doctorado o máster oficial habilitante para la realización de la tesis doctoral',
      docRef: 'section',
      single: true,
    },
    {
      code: '2.c',
      label: '2.c)',
      title: 'Grado de Doctor',
      docRef: 'section',
      single: true,
      notes: [
        'Se acompañará a este *Currículum vitae* **a)** fotocopia de la papeleta con la calificación o certificación de la Unidad de Doctorado, **b)** si fuera Premio Extraordinario, certificación de la Secretaria General donde queda reflejada la fecha en la que se tomó el acuerdo y **c)** si fuera Doctorado Internacional, certificación de la Comisión de Doctorado de dicha condición',
      ],
    },
    {
      code: '2.d',
      label: '2.d)',
      title:
        'Otros másteres universitarios no habilitantes para la realización de la tesis doctoral.',
      docRef: 'entry',
    },
    {
      code: '2.e',
      label: '2.e)',
      title: 'Otras titulaciones',
      docRef: 'section',
      notes: [TRANSCRIPT_NOTE],
    },
    { code: '2.f', label: '2.f)', title: 'Conocimiento de idiomas', docRef: 'entry' },
  ),
  ...sections(null, { code: '4', label: '4.-', title: 'CURRICULUM INVESTIGADOR' }),
  ...sections('4', { code: '4.a', label: '4.a)', title: 'Becas y contratos de Investigación' }),
  ...sections(
    '4.a',
    {
      code: '4.a.1',
      label: '4.a.1)',
      title: 'FPU, FPI u otras homologadas por la UEx',
      docRef: 'section',
    },
    {
      code: '4.a.2',
      label: '4.a.2)',
      title: 'Becas y contratos de Investigación Postdoctorales',
      docRef: 'section',
    },
    {
      code: '4.a.3',
      label: '4.a.3)',
      title: 'Otras Becas y contratos de Investigación',
      docRef: 'section',
    },
  ),
  ...sections(
    '4',
    {
      code: '4.b',
      label: '4.b)',
      title: 'Estancias subvencionadas',
      docRef: 'section',
      notes: [
        'Se acompañará a este *Currículum vitae* fotocopia de las **credenciales de becario**, especificando el periodo de disfrute de cada beca y la entidad financiadora. Para las estancias Centros de Investigación diferentes al de adscripción de la beca, **certificación de permanencia** (período) , emitida por el responsable del Centro de acogida.',
      ],
    },
    { code: '4.c', label: '4.c)', title: 'Publicaciones' },
  ),
  ...sections(
    '4.c',
    { code: '4.c.1', label: '4.c.1)', title: 'Libros con ISBN', docRef: 'section' },
    { code: '4.c.2', label: '4.c.2)', title: 'Capítulos de Libros con ISBN', docRef: 'section' },
    {
      code: '4.c.3',
      label: '4.c.3)',
      title: 'Artículos en revistas científicas',
      notes: [
        '(No se valorarán en este sub-apartado las ponencias y comunicaciones publicadas en actas de congresos. Éstas se valorarán en el sub-apartado 4d.)',
      ],
    },
  ),
  ...sections(
    '4.c.3',
    { code: '4.c.3.a', label: 'a)', title: 'Con índice de referencia', docRef: 'section' },
    { code: '4.c.3.b', label: 'b)', title: 'Sin índice de referencia', docRef: 'section' },
  ),
  ...sections(
    '4',
    {
      code: '4.d',
      label: '4.d)',
      title: 'Ponencias y comunicaciones presentadas a congresos',
      docRef: 'section',
    },
    {
      code: '4.e',
      label: '4.e)',
      title: 'Paneles y posters presentados a congresos',
      docRef: 'section',
    },
    {
      code: '4.f',
      label: '4.f)',
      title: 'Participación en proyectos de investigación',
      docRef: 'section',
    },
  ),
  ...sections(
    '4.f',
    { code: '4.f.1', label: '4.f1)', title: 'Autonómicos' },
    { code: '4.f.2', label: '4.f2)', title: 'Nacionales' },
    { code: '4.f.3', label: '4.f3)', title: 'Internacionales' },
  ),
  ...sections(
    '4',
    { code: '4.g', label: '4.g)', title: 'Dirección de Tesis Doctorales', docRef: 'section' },
    {
      code: '4.h',
      label: '4.h)',
      title: 'Participación en exposiciones de arte',
      docRef: 'section',
    },
    {
      code: '4.i',
      label: '4.i)',
      title: 'Participación en contratos y convenios con empresas',
      docRef: 'section',
    },
    {
      code: '4.j',
      label: '4.j)',
      title: 'Patentes en explotación o que hayan sido explotadas',
      docRef: 'section',
    },
    {
      code: '4.k',
      label: '4.k)',
      title: 'Trabajos de revisión para revistas del índice indicado en el apartado 4.c.3',
      docRef: 'section',
    },
  ),
  ...sections(null, {
    code: '5',
    label: '5.-',
    title: 'CURRICULUM PROFESIONAL',
    docRef: 'section',
  }),
];

const byCode = new Map(CV_SECTIONS.map((section) => [section.code, section]));

export function getCvSection(code: CvSectionCode): CvSectionDef {
  return byCode.get(code)!;
}

/** Apartados que no tienen subapartados: los únicos en los que caen méritos. */
export const CV_LEAF_SECTIONS: readonly CvSectionDef[] = CV_SECTIONS.filter(
  (section) => !CV_SECTIONS.some((child) => child.parent === section.code),
);

/** El apartado y sus antecesores, del más externo al más interno. */
export function cvSectionPath(code: CvSectionCode): CvSectionDef[] {
  const path: CvSectionDef[] = [];
  for (let section: CvSectionDef | undefined = byCode.get(code); section;) {
    path.unshift(section);
    section = section.parent ? byCode.get(section.parent) : undefined;
  }
  return path;
}

/** Título con numeración para la interfaz, p. ej. "4.c.3.a) Con índice de referencia". */
export function cvSectionHeading(code: CvSectionCode): string {
  const section = getCvSection(code);
  const label = section.label === 'a)' || section.label === 'b)' ? `${code})` : section.label;
  return `${label} ${section.title}`;
}
