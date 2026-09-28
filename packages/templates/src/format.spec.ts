import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, fullName, parseEmphasis, sortableName } from './format.js';

describe('formatos', () => {
  it('formatea fechas y números a la española', () => {
    expect(formatDate('2024-06-14')).toBe('14/06/2024');
    expect(formatDate(null)).toBe('');
    expect(formatNumber(8.125)).toBe('8,13');
    expect(formatNumber(1234)).toBe('1234');
    expect(formatNumber(null)).toBe('');
  });

  it('compone el nombre', () => {
    const person = { firstName: 'Lucía', lastNames: 'Fernández Gómez' };
    expect(fullName(person)).toBe('Lucía Fernández Gómez');
    expect(sortableName(person)).toBe('Fernández Gómez, Lucía');
    expect(sortableName({ firstName: null, lastNames: null })).toBe('');
  });

  it('interpreta las marcas de énfasis de las notas', () => {
    expect(parseEmphasis('Se acompañará a este *Currículum vitae* **a)** fotocopia')).toEqual([
      { text: 'Se acompañará a este ' },
      { text: 'Currículum vitae', italic: true },
      { text: ' ' },
      { text: 'a)', bold: true },
      { text: ' fotocopia' },
    ]);
    expect(parseEmphasis('del ***currículum***')).toEqual([
      { text: 'del ' },
      { text: 'currículum', bold: true, italic: true },
    ]);
  });
});
