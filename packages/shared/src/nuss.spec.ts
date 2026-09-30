import { describe, expect, it } from 'vitest';
import { formatNuss, isValidNuss, normalizeNuss, nussControlDigits } from './nuss.js';

describe('NUSS', () => {
  it('normaliza y formatea', () => {
    expect(normalizeNuss(' 28/12345678-40 ')).toBe('281234567840');
    expect(formatNuss('281234567840')).toBe('28/12345678/40');
    expect(formatNuss('123')).toBe('123');
  });

  it('calcula los dígitos de control concatenando la provincia si el número es grande', () => {
    // 2812345678 mod 97 = 40
    expect(nussControlDigits('28', '12345678')).toBe('40');
  });

  it('suma la provincia × 10.000.000 si el número es menor que 10.000.000', () => {
    // 01234567 + 8 × 10.000.000 = 81234567; mod 97 = 74
    expect(nussControlDigits('08', '01234567')).toBe('74');
    // 00123456 + 6 × 10.000.000 = 60123456; mod 97 = 43 (distinto de concatenar: 600123456 mod 97)
    expect(nussControlDigits('06', '00123456')).toBe('43');
  });

  it.each(['281234567840', '080123456774', '060012345643'])('%s es válido', (nuss) => {
    expect(isValidNuss(nuss)).toBe(true);
  });

  it.each(['281234567841', '28123456784', '2812345678400', '28/12345678/40', 'AB1234567840', ''])(
    '%s no es válido',
    (nuss) => {
      expect(isValidNuss(nuss)).toBe(false);
    },
  );
});
