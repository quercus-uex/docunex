import { CV_SECTIONS, type CvSectionDef, PACKAGE_BLOCKS } from '@docunex/shared';
import { describe, expect, it } from 'vitest';
import { AnnexIII } from './annex/AnnexIII.js';
import { CvDocument } from './cv/CvDocument.js';
import {
  EXAMPLE_ANNEX,
  EXAMPLE_CV_FULL,
  EXAMPLE_CV_SPARSE,
  EXAMPLE_INDEX,
  EXAMPLE_SEPARATORS,
} from './fixtures.js';
import { IndexSheet } from './index-sheet/IndexSheet.js';
import { Separator } from './separator/Separator.js';
import { renderPages } from './test/pdf.js';

/** Principio del título impreso; basta para localizarlo aunque el título ocupe dos líneas. */
function heading(section: CvSectionDef): string {
  return `${section.label} ${section.title}`.slice(0, 28);
}

function sheetCount(cover: string): number {
  return Number(/Número de hojas que contiene: (\d+)/.exec(cover)?.[1]);
}

describe('AnnexIII', () => {
  it('ocupa una página con los datos del solicitante, la plaza y la documentación', async () => {
    const pages = await renderPages(<AnnexIII model={EXAMPLE_ANNEX} />);
    expect(pages).toHaveLength(1);
    const [text] = pages as [string];
    for (const expected of [
      'ANEXO III',
      'PERSONAL CIENTÍFICO E INVESTIGADOR (PCI)',
      'Apellidos: Fernández Gómez',
      'Nombre: Lucía',
      'D.N.I.: 12345678Z',
      'Titulación: Grado en Ingeniería Informática',
      'IN123456',
      '15/09/2026',
      'Fecha: 28/09/2026',
      '(Firma del solicitante)',
      ...PACKAGE_BLOCKS.map((block) => `${block.number}. ${block.title}`),
      'Código RedSara:U00200011',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('deja los huecos en blanco si faltan datos', async () => {
    const pages = await renderPages(
      <AnnexIII
        model={{
          applicant: Object.fromEntries(
            Object.keys(EXAMPLE_ANNEX.applicant).map((key) => [key, null]),
          ) as typeof EXAMPLE_ANNEX.applicant,
          positionCode: null,
          resolutionDate: null,
          date: null,
        }}
      />,
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain('Código de la plaza Fecha Resolución IN');
  });
});

describe('CvDocument', () => {
  it('con méritos en todos los apartados, los imprime todos en el orden de la plantilla', async () => {
    const pages = await renderPages(<CvDocument model={EXAMPLE_CV_FULL} />);
    expect(sheetCount(pages[0]!)).toBe(pages.length);

    const body = pages.slice(1).join(' ');
    const positions = CV_SECTIONS.map((section) => [section.code, body.indexOf(heading(section))]);
    for (const [code, position] of positions) expect(position, String(code)).toBeGreaterThan(-1);
    const found = positions.map(([, position]) => position as number);
    expect(found).toEqual([...found].sort((a, b) => a - b));

    expect(body).toContain('Doc. nº: DOC_02'); // certificación académica: requisito y 2.a
    expect(body).toMatch(
      /4\.f\) Participación en proyectos de investigación Doc\. nº: DOC_\d+–DOC_\d+/,
    );
    expect(body).toContain('JCR, Q1, Computer Science, Theory & Methods');
    expect(body).toContain('Latindex, No incluido');
    expect(body).toContain('Carácter (Nal./Internal.): Internacional');
  });

  it('omite los apartados vacíos a cualquier nivel sin renumerar los demás', async () => {
    const pages = await renderPages(<CvDocument model={EXAMPLE_CV_SPARSE} />);
    expect(sheetCount(pages[0]!)).toBe(pages.length);
    const body = pages.slice(1).join(' ');

    const present = ['2', '2.a', '2.f', '4', '4.c', '4.c.3', '4.c.3.b', '4.f', '4.f.2'];
    for (const section of CV_SECTIONS) {
      if (present.includes(section.code)) expect(body, section.code).toContain(heading(section));
      else expect(body, section.code).not.toContain(heading(section));
    }
  });

  it('sin numeración ni datos del solicitante deja los huecos en blanco', async () => {
    const pages = await renderPages(
      <CvDocument
        model={{
          ...EXAMPLE_CV_SPARSE,
          applicant: { firstName: null, lastNames: null, dni: null },
          positionCode: null,
          date: null,
        }}
      />,
    );
    expect(pages[0]).toContain('Nombre: D.N.I.: Fecha: Código plaza: Firma:');
  });
});

describe('IndexSheet', () => {
  it('lista cada documento con su página y repite la cabecera en cada hoja', async () => {
    const pages = await renderPages(<IndexSheet model={EXAMPLE_INDEX} />);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page).toContain('Vicerrectorado de Investigación y Transferencia');
      expect(page).toContain('NOMBRE DOCUMENTO');
    }
    const text = pages.join(' ');
    expect(pages[0]).toContain('APELLIDOS Y NOMBRE Fernández Gómez, Lucía');
    expect(pages[0]).toContain('CÓDIGO PLAZA IN123456');
    for (const entry of EXAMPLE_INDEX.entries) {
      expect(text).toContain(`DOC_${String(entry.code).padStart(2, '0')} ${entry.name}`);
    }
    expect(pages.at(-1)).toContain('Sr. Vicerrector de Investigación y Transferencia');
  });
});

describe('Separator', () => {
  it('muestra el número y el título del bloque en una página', async () => {
    const [model] = EXAMPLE_SEPARATORS as [(typeof EXAMPLE_SEPARATORS)[number]];
    const pages = await renderPages(<Separator model={model} />);
    expect(pages).toEqual([`${model.number} ${model.title}`]);
  });
});
