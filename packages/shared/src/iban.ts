/** Quita espacios y guiones y pasa a mayúsculas: `es91 2100-0418…` → `ES912100…`. */
export function normalizeIban(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

/** Longitud del IBAN de España. */
const SPANISH_IBAN_LENGTH = 24;

/** Pesos de los dígitos de control de la cuenta española (CCC). */
const CCC_WEIGHTS = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];

/** Dígito de control del CCC sobre 10 dígitos (entidad y oficina con dos ceros delante, o la cuenta). */
function cccDigit(digits: string): number {
  const sum = [...digits].reduce(
    (total, digit, index) => total + Number(digit) * CCC_WEIGHTS[index]!,
    0,
  );
  const digit = 11 - (sum % 11);
  return digit === 11 ? 0 : digit === 10 ? 1 : digit;
}

/** Comprueba los dos dígitos de control nacionales de una cuenta española (`ES` + 22 dígitos). */
function isValidSpanishAccount(iban: string): boolean {
  if (!/^ES\d{22}$/.test(iban)) return false;
  const bban = iban.slice(4);
  const bankAndBranch = bban.slice(0, 8);
  const checkDigits = bban.slice(8, 10);
  const account = bban.slice(10);
  return `${cccDigit(`00${bankAndBranch}`)}${cccDigit(account)}` === checkDigits;
}

/**
 * Valida un IBAN ya normalizado (ISO 13616): formato, dígitos de control (módulo 97) y, si es español,
 * su longitud y los dígitos de control de la cuenta.
 */
export function isValidIban(value: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false;
  if (
    value.startsWith('ES') &&
    (value.length !== SPANISH_IBAN_LENGTH || !isValidSpanishAccount(value))
  ) {
    return false;
  }
  // Se pasan los cuatro primeros caracteres al final y cada letra a número (A = 10 … Z = 35).
  const rearranged = value.slice(4) + value.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** IBAN en grupos de cuatro, como se imprime: `ES91 2100 0418 4502 0005 1332`. */
export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ');
}
