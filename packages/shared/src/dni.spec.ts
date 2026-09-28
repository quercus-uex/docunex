import { describe, expect, it } from 'vitest';
import { isValidDni, normalizeDni } from './dni.js';

describe('DNI/NIE', () => {
  it('normaliza el formato', () => {
    expect(normalizeDni(' 12.345.678-z ')).toBe('12345678Z');
  });

  it.each(['12345678Z', '00000000T', 'X1234567L', 'Y1234567X', 'Z1234567R'])(
    '%s es válido',
    (dni) => {
      expect(isValidDni(dni)).toBe(true);
    },
  );

  it.each(['12345678A', '1234567Z', 'X1234567A', 'W1234567L', ''])('%s no es válido', (dni) => {
    expect(isValidDni(dni)).toBe(false);
  });
});
