import { z } from 'zod';

/** Fecha sin hora en formato ISO (`YYYY-MM-DD`). */
export const isoDateSchema = z.iso.date('Fecha no válida');

function blankToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Texto opcional: recorta espacios y convierte la cadena vacía en `null`. */
export function nullableText(max: number) {
  return z.string().max(max, `Máximo ${max} caracteres`).nullable().transform(blankToNull);
}

/** Campo opcional con formato: la cadena vacía es `null`; si hay valor, debe cumplir `schema`. */
export function nullableFormat<T>(schema: z.ZodType<T, string>) {
  return z.string().nullable().transform(blankToNull).pipe(schema.nullable());
}
