import { describe, expect, it } from 'vitest';
import { formatIban, isValidIban, normalizeIban } from './iban.js';

describe('IBAN', () => {
  it('normaliza el formato', () => {
    expect(normalizeIban(' es91 2100-0418 4502 0005 1332 ')).toBe('ES9121000418450200051332');
  });

  it('agrupa de cuatro en cuatro', () => {
    expect(formatIban('ES9121000418450200051332')).toBe('ES91 2100 0418 4502 0005 1332');
    expect(formatIban('de89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });

  it.each([
    'ES9121000418450200051332',
    'ES6000491500051234567892',
    'DE89370400440532013000',
    'FR1420041010050500013M02606',
    'PT50000201231234567890154',
  ])('%s es válido', (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it.each([
    ['dígitos de control IBAN', 'ES9121000418450200051333'],
    ['longitud española', 'ES912100041845020005133'],
    ['dígitos de control de la cuenta española', 'ES2921000418460200051332'],
    ['formato', 'ES91-2100'],
    ['país', '9121000418450200051332'],
    ['vacío', ''],
  ])('rechaza un IBAN con mal %s', (_, iban) => {
    expect(isValidIban(iban)).toBe(false);
  });
});
