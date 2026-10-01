import type { MeritData, MeritType } from '../merits/catalog.js';
import type { CvSectionCode } from '../merits/cv-sections.js';

/** Intervalo de puntos: lo que se suma seguro y lo que se podría alcanzar. */
export interface ScoreRange {
  /** Mínimo garantizado: solo los méritos cuya puntuación no depende de la comisión. */
  min: number;
  /** Máximo posible: todo lo alegado, si la comisión lo valora con la puntuación completa. */
  max: number;
}

/**
 * Lo que decide la comisión de selección y hace que un mérito no sume de forma directa. Un mérito
 * con alguno de estos factores aporta 0 al mínimo y su valor completo al máximo.
 */
export type CommissionFactor =
  /** Relación directa (puntuación completa), afín (la mitad) o ninguna (no puntúa) con la plaza. */
  | 'relation'
  /** Tramo de la editorial según el SPI, que la comisión fija en su primera reunión. */
  | 'publisher_tier'
  /** Índice de referencia de las revistas (JCR, SJR…), que elige la comisión. */
  | 'journal_index'
  /** Factor de autoría N/n, con el N medio del área que fija la comisión. */
  | 'authors'
  /** Que el proyecto proceda de una convocatoria competitiva. */
  | 'competitive'
  /** Solo se valora en ciertas áreas de conocimiento. */
  | 'area';

/** Parte de la puntuación de un mérito imputada a un año natural (para los topes anuales). */
export interface ScorePortion {
  year: number | null;
  points: number;
}

/** Puntuación de un mérito según una regla del baremo, antes de aplicar topes. */
export interface RuleResult {
  /** Puntos si la comisión valora el mérito con la puntuación completa. */
  portions: ScorePortion[];
  /** Cómo se calcula, p. ej. "C1: 3 niveles desde el B1 × 0,4". */
  basis: string;
  /** Factores de la comisión propios de la regla (se suman al de relación con la plaza). */
  factors?: CommissionFactor[];
  /** Avisos para el usuario (datos que faltan, aproximaciones…). */
  notes?: string[];
  /**
   * Méritos con la misma clave compiten entre sí y solo cuenta el de más puntos (p. ej. un idioma
   * con varios certificados o varias contribuciones a un mismo congreso).
   */
  exclusiveKey?: string;
  /** Tope del subapartado al que se imputa, si tiene varios (p. ej. exposiciones individuales). */
  capKey?: string;
}

/** Datos auxiliares para las reglas. */
export interface ScoringContext {
  /** Fecha (ISO) a la que se valoran los méritos: lo posterior no cuenta. */
  referenceDate: string;
  /** Nombre y apellidos de la persona candidata, para saber si es investigadora principal. */
  applicantName: string | null;
}

export type MeritRule<T extends MeritType> = (
  data: MeritData<T>,
  context: ScoringContext,
) => RuleResult;

export type MeritRules = { [T in MeritType]?: MeritRule<T> };

/** Tope de un subapartado: en total y/o por año natural, para todo él o para una `capKey`. */
export interface ScoreCap {
  key?: string;
  max?: number;
  maxPerYear?: number;
  /** Explicación literal del tope. */
  label: string;
}

/** Subapartado del baremo (p. ej. "2.f Conocimiento de idiomas"). */
export interface BaremoItemDef {
  id: string;
  /** Numeración para la interfaz: "2.f)". */
  label: string;
  title: string;
  /** Apartados del CV cuyos méritos puntúan aquí. */
  cvSections: readonly CvSectionCode[];
  /**
   * Se valora sin tener en cuenta la relación con el área y el perfil de la plaza. Sus méritos
   * suman de forma directa salvo que la regla añada otro factor de la comisión.
   */
  profileIndependent?: boolean;
  /** Solo cuenta un mérito: el de más puntos (la plantilla del CV prevé una sola entrada). */
  single?: boolean;
  caps?: readonly ScoreCap[];
  /** Criterio literal del baremo, resumido. */
  criteria: string;
}

/** Apartado del baremo (p. ej. "2. Currículum académico"), con su ponderación. */
export interface BaremoSectionDef {
  id: string;
  title: string;
  /** Factor por el que se multiplica la puntuación del apartado. */
  weight: number;
  items: readonly BaremoItemDef[];
}

export interface BaremoSource {
  /** Cita corta. */
  title: string;
  /** Disposición y publicación. */
  reference: string;
  url: string;
  /** Otras referencias que justifican que es el baremo aplicable. */
  notes: readonly { text: string; url?: string }[];
}

export interface Baremo {
  id: string;
  /** Tipo de plaza al que se aplica. */
  positionKind: string;
  name: string;
  source: BaremoSource;
  sections: readonly BaremoSectionDef[];
  rules: MeritRules;
  /** Explicación de cada factor de la comisión. */
  factorLabels: Record<CommissionFactor, string>;
}

// --- Resultado ---------------------------------------------------------------------------------

/** Puntuación de un mérito. */
export interface MeritScore {
  meritId: string;
  type: MeritType;
  itemId: string;
  /** Puntos si la comisión lo valora todo con la puntuación completa, antes de topes. */
  points: number;
  /** No depende de la comisión: suma al mínimo garantizado. */
  direct: boolean;
  factors: CommissionFactor[];
  basis: string;
  notes: string[];
  /** Mérito del mismo grupo excluyente que cuenta en su lugar (en el cálculo del máximo). */
  supersededBy: string | null;
}

export interface BaremoItemScore {
  item: BaremoItemDef;
  /** Puntos sin ponderar, con los topes aplicados. */
  score: ScoreRange;
  /** Algún tope ha recortado el máximo o el mínimo. */
  capped: boolean;
  merits: MeritScore[];
}

export interface BaremoSectionScore {
  section: BaremoSectionDef;
  /** Suma de los subapartados, sin ponderar. */
  raw: ScoreRange;
  /** `raw` × ponderación del apartado. */
  weighted: ScoreRange;
  items: BaremoItemScore[];
}

/** Mérito que el baremo no puntúa (o cuyos datos no se pueden leer). */
export interface UnscoredMerit {
  meritId: string;
  type: MeritType;
  reason: string;
}

export interface ScoreSummary {
  baremo: Baremo;
  sections: BaremoSectionScore[];
  /** Suma ponderada de los apartados. */
  total: ScoreRange;
  /** Por mérito, para mostrarlo junto a cada uno. */
  byMerit: Map<string, MeritScore>;
  unscored: UnscoredMerit[];
}
