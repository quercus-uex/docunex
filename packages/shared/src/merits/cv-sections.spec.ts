import { describe, expect, it } from 'vitest';
import {
  CV_LEAF_SECTIONS,
  CV_SECTION_CODES,
  CV_SECTIONS,
  cvSectionHeading,
  cvSectionPath,
} from './cv-sections.js';

describe('CV_SECTIONS', () => {
  it('sigue el orden de CV_SECTION_CODES y cada padre va antes que sus hijos', () => {
    expect(CV_SECTIONS.map((section) => section.code)).toEqual([...CV_SECTION_CODES]);
    CV_SECTIONS.forEach((section, index) => {
      if (!section.parent) return;
      const parentIndex = CV_SECTIONS.findIndex((other) => other.code === section.parent);
      expect(parentIndex).toBeGreaterThanOrEqual(0);
      expect(parentIndex).toBeLessThan(index);
    });
  });

  it('cada apartado hoja tiene un único "Doc. nº" en su camino', () => {
    for (const leaf of CV_LEAF_SECTIONS) {
      const refs = cvSectionPath(leaf.code).filter((section) => section.docRef !== null);
      expect(refs, leaf.code).toHaveLength(1);
    }
  });

  it('los proyectos llevan el "Doc. nº" en 4.f, no en cada subapartado', () => {
    expect(cvSectionPath('4.f.2').map((section) => [section.code, section.docRef])).toEqual([
      ['4', null],
      ['4.f', 'section'],
      ['4.f.2', null],
    ]);
  });

  it('forma los títulos para la interfaz', () => {
    expect(cvSectionHeading('4.c.3.a')).toBe('4.c.3.a) Con índice de referencia');
    expect(cvSectionHeading('4.f.1')).toBe('4.f1) Autonómicos');
    expect(cvSectionHeading('5')).toBe('5.- CURRICULUM PROFESIONAL');
  });
});
