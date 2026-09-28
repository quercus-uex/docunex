import { z } from 'zod';

/** Muestra el campo solo si otro campo del mismo formulario tiene cierto valor. */
export interface FieldCondition {
  field: string;
  equals: string | boolean;
}

interface FieldCommon {
  label: string;
  required: boolean;
  /** Columnas (de 12) que ocupa en el formulario. */
  span: number;
  help?: string;
  placeholder?: string;
  when?: FieldCondition;
}

export interface SelectOption {
  value: string;
  label: string;
}

/** Metadatos de un campo para pintar el formulario genérico. */
export type FieldDef =
  | (FieldCommon & { kind: 'text'; max: number; multiline: boolean })
  | (FieldCommon & { kind: 'integer'; min: number; max: number })
  | (FieldCommon & {
      kind: 'decimal';
      min: number;
      max: number;
      decimals: number;
      /** Se propone calculando los meses entre dos campos de fecha. */
      monthsBetween?: { start: string; end: string };
    })
  | (FieldCommon & { kind: 'date' })
  | (FieldCommon & { kind: 'year' })
  | (FieldCommon & { kind: 'boolean' })
  | (FieldCommon & { kind: 'select'; options: readonly SelectOption[] })
  | (FieldCommon & { kind: 'list'; itemLabel: string; max: number; fields: FieldDefs });

export type FieldDefs = Record<string, FieldDef>;

/** Campo de un mérito: metadatos para la interfaz y esquema de su valor. */
export interface Field<T> {
  def: FieldDef;
  schema: z.ZodType<T>;
}

export type Fields = Record<string, Field<unknown>>;

export type FieldsOutput<F extends Fields> = {
  [K in keyof F]: F[K] extends Field<infer T> ? T : never;
};

type Layout = Pick<FieldCommon, 'span' | 'help' | 'placeholder'>;
type Options<R extends boolean> = Partial<Layout> & { required?: R };
type Value<T, R extends boolean> = R extends true ? T : T | null;

const REQUIRED = 'Obligatorio';

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Mensaje "Obligatorio" si falta el valor y `invalid` si el valor no es válido. */
function errorFor(invalid: string) {
  return { error: (issue: { input?: unknown }) => (isBlank(issue.input) ? REQUIRED : invalid) };
}

function common(label: string, options: Options<boolean>, span: FieldCommon['span']): FieldCommon {
  return {
    label,
    required: options.required ?? false,
    span: options.span ?? span,
    ...(options.help !== undefined && { help: options.help }),
    ...(options.placeholder !== undefined && { placeholder: options.placeholder }),
  };
}

function optionalUnlessRequired<T>(
  schema: z.ZodType<T>,
  required: boolean,
): z.ZodType<T> | z.ZodType<T | null> {
  return required ? schema : schema.nullish().transform((value) => value ?? null);
}

export function text<R extends boolean = false>(
  label: string,
  options: Options<R> & { max?: number; multiline?: boolean } = {},
): Field<Value<string, R>> {
  const max = options.max ?? 500;
  const base = z.string(errorFor('Texto no válido')).trim().max(max, `Máximo ${max} caracteres`);
  const schema = options.required
    ? base.min(1, REQUIRED)
    : z
        .string()
        .nullish()
        .transform((value) => (value?.trim() ? value : null))
        .pipe(base.nullable());
  return {
    def: {
      ...common(label, options, 12),
      kind: 'text',
      max,
      multiline: options.multiline ?? false,
    },
    schema: schema as z.ZodType<Value<string, R>>,
  };
}

export function integer<R extends boolean = false>(
  label: string,
  options: Options<R> & { min?: number; max?: number } = {},
): Field<Value<number, R>> {
  const min = options.min ?? 0;
  const max = options.max ?? 100_000;
  const schema = z
    .number(errorFor('Número no válido'))
    .int('Debe ser un número entero')
    .min(min, `Mínimo ${min}`)
    .max(max, `Máximo ${max}`);
  return {
    def: { ...common(label, options, 3), kind: 'integer', min, max },
    schema: optionalUnlessRequired(schema, options.required ?? false) as z.ZodType<
      Value<number, R>
    >,
  };
}

export function decimal<R extends boolean = false>(
  label: string,
  options: Options<R> & {
    min?: number;
    max?: number;
    decimals?: number;
    monthsBetween?: { start: string; end: string };
  } = {},
): Field<Value<number, R>> {
  const min = options.min ?? 0;
  const max = options.max ?? 100_000;
  const decimals = options.decimals ?? 2;
  const schema = z
    .number(errorFor('Número no válido'))
    .min(min, `Mínimo ${min}`)
    .max(max, `Máximo ${max}`)
    .refine(
      (value) => Number.isInteger(Math.round(value * 10 ** decimals * 1e6) / 1e6),
      `Máximo ${decimals} decimales`,
    );
  return {
    def: {
      ...common(label, options, 3),
      kind: 'decimal',
      min,
      max,
      decimals,
      ...(options.monthsBetween && { monthsBetween: options.monthsBetween }),
    },
    schema: optionalUnlessRequired(schema, options.required ?? false) as z.ZodType<
      Value<number, R>
    >,
  };
}

export function date<R extends boolean = false>(
  label: string,
  options: Options<R> = {},
): Field<Value<string, R>> {
  const schema = z.iso.date(errorFor('Fecha no válida'));
  return {
    def: { ...common(label, options, 4), kind: 'date' },
    schema: optionalUnlessRequired(schema, options.required ?? false) as z.ZodType<
      Value<string, R>
    >,
  };
}

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

export function year<R extends boolean = false>(
  label: string,
  options: Options<R> = {},
): Field<Value<number, R>> {
  const schema = z
    .number(errorFor('Año no válido'))
    .int('Año no válido')
    .min(MIN_YEAR, 'Año no válido')
    .max(MAX_YEAR, 'Año no válido');
  return {
    def: { ...common(label, options, 3), kind: 'year' },
    schema: optionalUnlessRequired(schema, options.required ?? false) as z.ZodType<
      Value<number, R>
    >,
  };
}

/** Casilla Sí/No. Nunca es `null`: si no se marca, es `false`. */
export function boolean(label: string, options: Partial<Layout> = {}): Field<boolean> {
  return {
    def: { ...common(label, options, 4), kind: 'boolean' },
    schema: z.boolean().default(false) as z.ZodType<boolean>,
  };
}

export function select<const V extends string, R extends boolean = false>(
  label: string,
  options: readonly { value: V; label: string }[],
  config: Options<R> = {},
): Field<Value<V, R>> {
  const values = options.map((option) => option.value) as [V, ...V[]];
  const schema = z.enum(values, errorFor('Opción no válida'));
  return {
    def: { ...common(label, config, 4), kind: 'select', options },
    schema: optionalUnlessRequired(schema, config.required ?? false) as z.ZodType<Value<V, R>>,
  };
}

/** Lista repetible de subformularios (p. ej. los cursos de doctorado). */
export function list<F extends Fields>(
  label: string,
  fields: F,
  options: Partial<Layout> & { itemLabel: string; max?: number },
): Field<FieldsOutput<F>[]> {
  const max = options.max ?? 50;
  return {
    def: {
      ...common(label, options, 12),
      kind: 'list',
      itemLabel: options.itemLabel,
      max,
      fields: fieldDefs(fields),
    },
    schema: z.array(objectSchema(fields)).max(max, `Máximo ${max}`),
  };
}

/** Hace que un campo solo se muestre, y solo se exija, si se cumple `condition`. */
export function onlyIf<T>(condition: FieldCondition, field: Field<T>): Field<T | null> {
  return { def: { ...field.def, when: condition }, schema: field.schema.nullable() };
}

export function fieldDefs(fields: Fields): FieldDefs {
  return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.def]));
}

export function isVisible(def: FieldDef, values: Record<string, unknown>): boolean {
  return !def.when || values[def.when.field] === def.when.equals;
}

/** Etiqueta de la opción elegida en un campo `select` (o el propio valor si no es una opción). */
export function optionLabel(defs: FieldDefs, field: string, value: string | null): string {
  if (value === null) return '';
  const def = defs[field];
  return (def?.kind === 'select' && def.options.find((o) => o.value === value)?.label) || value;
}

/**
 * Esquema de un objeto con estos campos. Los campos ocultos por su condición se guardan como
 * `null`; los visibles y obligatorios deben tener valor.
 */
export function objectSchema<F extends Fields>(fields: F): z.ZodType<FieldsOutput<F>> {
  const shape = Object.fromEntries(Object.entries(fields).map(([name, f]) => [name, f.schema]));
  const conditional = Object.entries(fields).filter(([, field]) => field.def.when);

  const clearHidden = (input: unknown) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
    const values = { ...(input as Record<string, unknown>) };
    for (const [name, field] of conditional) {
      if (!isVisible(field.def, values)) values[name] = null;
    }
    return values;
  };

  return z
    .preprocess(clearHidden, z.object(shape))
    .superRefine((data: Record<string, unknown>, ctx) => {
      for (const [name, field] of conditional) {
        if (field.def.required && isVisible(field.def, data) && data[name] === null) {
          ctx.addIssue({ code: 'custom', message: REQUIRED, path: [name] });
        }
      }
    }) as unknown as z.ZodType<FieldsOutput<F>>;
}

/** Valores iniciales de un formulario vacío. */
export function emptyFormValues(defs: FieldDefs): Record<string, unknown> {
  return Object.fromEntries(Object.entries(defs).map(([name, def]) => [name, emptyValue(def)]));
}

function emptyValue(def: FieldDef): unknown {
  switch (def.kind) {
    case 'text':
      return '';
    case 'boolean':
      return false;
    case 'list':
      return [];
    default:
      return null;
  }
}

/** Valores del formulario a partir de datos guardados: `null` pasa a `''` en los textos. */
export function toFormValues(
  defs: FieldDefs,
  data: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(defs).map(([name, def]) => {
      const value = data[name];
      if (value === undefined || value === null) return [name, emptyValue(def)];
      if (def.kind === 'list' && Array.isArray(value)) {
        return [
          name,
          value.map((item: unknown) => toFormValues(def.fields, item as Record<string, unknown>)),
        ];
      }
      return [name, value];
    }),
  );
}

const DAYS_PER_MONTH = 365.25 / 12;

/**
 * Meses entre dos fechas ISO, ambas incluidas, con un decimal. `null` si falta alguna o si el fin
 * es anterior al inicio.
 */
export function monthsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.round((days / DAYS_PER_MONTH) * 10) / 10;
}
