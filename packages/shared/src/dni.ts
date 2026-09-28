const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIE_PREFIX: Record<string, string> = { X: '0', Y: '1', Z: '2' };

/** Quita espacios, guiones y puntos y pasa a mayúsculas: `12.345.678-z` → `12345678Z`. */
export function normalizeDni(value: string): string {
  return value.replace(/[\s.-]/g, '').toUpperCase();
}

/** Valida un DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra) ya normalizado. */
export function isValidDni(value: string): boolean {
  const match = /^([XYZ]\d{7}|\d{8})([A-Z])$/.exec(value);
  if (!match) return false;
  const [, body, letter] = match;
  const digits = body.replace(/^[XYZ]/, (prefix) => NIE_PREFIX[prefix]);
  return CONTROL_LETTERS[Number(digits) % 23] === letter;
}
