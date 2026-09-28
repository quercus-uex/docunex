import { MERIT_EXAMPLES } from '@docunex/shared';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_APPLICANT } from '../fixtures.js';
import { buildCvModel, type CvMeritInput, type CvSectionNode } from './model.js';

const base = {
  applicant: EXAMPLE_APPLICANT,
  positionCode: 'IN123456',
  date: '2026-09-28',
  degreeVerifications: [],
};

function codes(nodes: CvSectionNode[]): string[] {
  return nodes.flatMap((node) => [node.section.code, ...codes(node.children)]);
}

describe('buildCvModel', () => {
  it('solo incluye los apartados con méritos, a cualquier nivel, en el orden del CV', () => {
    const merits: CvMeritInput[] = [
      {
        type: 'professional_activity',
        data: MERIT_EXAMPLES.professional_activity,
        documentIds: [],
      },
      { type: 'project', data: MERIT_EXAMPLES.project, documentIds: [] },
      { type: 'language', data: MERIT_EXAMPLES.language, documentIds: [] },
    ];
    const model = buildCvModel({ ...base, merits });
    expect(codes(model.sections)).toEqual(['2', '2.f', '4', '4.f', '4.f.2', '5']);
  });

  it('respeta el orden de entrada dentro de cada apartado', () => {
    const older = { ...MERIT_EXAMPLES.conference_talk, title: 'Antigua', year: 2019 };
    const newer = { ...MERIT_EXAMPLES.conference_talk, title: 'Reciente', year: 2025 };
    const model = buildCvModel({
      ...base,
      merits: [
        { type: 'conference_talk', data: newer, documentIds: [] },
        { type: 'conference_talk', data: older, documentIds: [] },
      ],
    });
    const talks = model.sections[0]!.children[0]!.entries;
    expect(talks.map((entry) => (entry.data as { title: string }).title)).toEqual([
      'Reciente',
      'Antigua',
    ]);
  });

  it('reúne los DOC_nn de cada entrada y de cada apartado sin repetirlos', () => {
    const model = buildCvModel({
      ...base,
      merits: [
        { type: 'project', data: MERIT_EXAMPLES.project, documentIds: ['a', 'b'] },
        {
          type: 'project',
          data: { ...MERIT_EXAMPLES.project, scope: 'international' },
          documentIds: ['b', 'c', 'sin-numero'],
        },
      ],
      docCodes: new Map([
        ['a', 7],
        ['b', 8],
        ['c', 9],
      ]),
    });
    const projects = model.sections[0]!.children[0]!;
    expect(projects.section.code).toBe('4.f');
    expect(projects.docCodes).toEqual([7, 8, 9]);
    expect(projects.children.map((child) => child.entries[0]!.docCodes)).toEqual([
      [7, 8],
      [8, 9],
    ]);
  });

  it('sin numeración deja los códigos vacíos', () => {
    const model = buildCvModel({
      ...base,
      merits: [{ type: 'language', data: MERIT_EXAMPLES.language, documentIds: ['a'] }],
    });
    expect(model.sections[0]!.docCodes).toEqual([]);
  });

  it('rechaza datos que no cumplen el esquema de su tipo', () => {
    expect(() =>
      buildCvModel({
        ...base,
        merits: [{ type: 'language', data: { language: 'Inglés' }, documentIds: [] }],
      }),
    ).toThrow('Datos no válidos en un mérito de tipo "Idioma"');
  });
});
