/**
 * Número de afiliación a la Seguridad Social (NUSS): 12 dígitos, `PP NNNNNNNN CC` (provincia, número
 * y dígitos de control).
 */

/** Quita espacios, barras, guiones y puntos: `28/12345678/40` → `281234567840`. */
export function normalizeNuss(value: string): string {
  return value.replace(/[\s/.-]/g, '');
}

/**
 * Dígitos de control de un NUSS: el resto de dividir entre 97 el número formado por la provincia y el
 * número. Si el número es menor que 10.000.000, se le suma la provincia multiplicada por 10.000.000;
 * si no, se concatenan.
 */
export function nussControlDigits(province: string, number: string): string {
  const n = Number(number);
  const base = n < 10_000_000 ? n + Number(province) * 10_000_000 : Number(`${province}${number}`);
  return String(base % 97).padStart(2, '0');
}

/** Valida un NUSS ya normalizado (12 dígitos con los de control correctos). */
export function isValidNuss(value: string): boolean {
  const match = /^(\d{2})(\d{8})(\d{2})$/.exec(value);
  if (!match) return false;
  const [, province, number, control] = match;
  return nussControlDigits(province!, number!) === control;
}

/** NUSS como se suele escribir: `28/12345678/40`. */
export function formatNuss(value: string): string {
  const nuss = normalizeNuss(value);
  return /^\d{12}$/.test(nuss)
    ? `${nuss.slice(0, 2)}/${nuss.slice(2, 10)}/${nuss.slice(10)}`
    : nuss;
}
