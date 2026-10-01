import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parsePciListing } from './pci-listing.parser.js';

const BASE_URL = 'https://rrhhinvestigacion.unex.es/funciones/concursos/convocatorias-pci/';
const PDF_BASE = 'https://rrhhinvestigacion.unex.es/wp-content/uploads/sites/58';

async function fixture() {
  const html = await readFile(
    new URL('./__fixtures__/convocatorias-pci.html', import.meta.url),
    'utf8',
  );
  return parsePciListing(html, BASE_URL);
}

describe('parsePciListing', () => {
  it('lee las plazas de todas las tablas, de la más reciente a la más antigua', async () => {
    const positions = await fixture();
    expect(positions.map((position) => position.code)).toEqual([
      'IN000939',
      'IN000928',
      'IN000920',
      'IN000917',
      'IN000916',
      'IN000913',
      'IN000889',
      'IN000881',
      'IN000745',
      'IN000656',
    ]);
  });

  it('toma departamento, centro, observaciones y fin del plazo de solicitudes', async () => {
    const position = (await fixture()).find(({ code }) => code === 'IN000939');
    expect(position).toEqual({
      code: 'IN000939',
      department: 'Arte y Ciencias del Territorio',
      center: 'Facultad de Filosofía y Letras',
      observations: 'Fin de plazo de presentación de solicitudes: 01 de octubre de 2026',
      deadline: '2026-10-01',
      stage: 'call',
      documents: {
        // Los enlaces relativos se resuelven contra la URL de la página.
        call: `${PDF_BASE}/2026/09/IN000939_C.pdf`,
        firstMinutes: null,
        secondMinutes: null,
      },
    });
  });

  it('la fase es la del último documento publicado', async () => {
    const stages = Object.fromEntries(
      (await fixture()).map(({ code, stage }) => [code, stage] as const),
    );
    expect(stages).toMatchObject({
      IN000939: 'call',
      IN000928: 'firstMinutes',
      IN000917: 'secondMinutes',
      IN000881: 'firstMinutes',
    });
  });

  it('ignora las celdas vacías y los plazos que no son de solicitudes', async () => {
    const positions = await fixture();
    expect(positions.find(({ code }) => code === 'IN000881')?.observations).toBeNull();
    expect(positions.find(({ code }) => code === 'IN000928')?.deadline).toBeNull();
  });

  it('detecta los PDF de plazas que están fuera de la tabla', async () => {
    const position = (await fixture()).find(({ code }) => code === 'IN000745');
    expect(position).toMatchObject({
      department: null,
      stage: 'firstMinutes',
      documents: {
        call: `${PDF_BASE}/2026/04/IN000745_C.pdf`,
        firstMinutes: `${PDF_BASE}/2026/04/IN000745_A1.pdf`,
        secondMinutes: null,
      },
    });
  });

  it('reconoce las columnas por su título, en cualquier orden', () => {
    const html = `
      <table>
        <tr><th>Observaciones</th><th>Acta 2</th><th>Código de plaza</th><th>Dpto.</th></tr>
        <tr><td>RESUELTA</td><td><a href="/x/otro-nombre.pdf">Ver</a></td><td>in000100</td><td>Física</td></tr>
      </table>`;
    expect(parsePciListing(html, BASE_URL)).toEqual([
      {
        code: 'IN000100',
        department: 'Física',
        center: null,
        observations: 'RESUELTA',
        deadline: null,
        stage: 'secondMinutes',
        documents: {
          call: null,
          firstMinutes: null,
          secondMinutes: 'https://rrhhinvestigacion.unex.es/x/otro-nombre.pdf',
        },
      },
    ]);
  });

  // Marcado real de la web: cabecera en celdas `<td>` con «Cod. Plaza» y PDF enlazados con un icono.
  const REAL_HEADER = `
    <tr>
      <td class="text-center"><strong>Cod. Plaza</strong></td>
      <td class="text-center"><strong>Departamento</strong></td>
      <td class="text-center"><strong>Centro</strong></td>
      <td class="text-center"><strong>Convocatoria</strong></td>
      <td class="text-center"><strong>Acta 1</strong></td>
      <td><strong>Acta </strong><strong>2</strong></td>
      <td><strong>Observaciones</strong></td>
    </tr>`;
  const realRow = (code: string, file: string, observations: string) => `
    <tr>
      <td><strong>${code}</strong></td>
      <td><strong>Expresión Gráfica</strong></td>
      <td><strong>Escuela de Ingenierías Industriales</strong></td>
      <td><span><a href="${PDF_BASE}/2024/10/${file}_C.pdf"><img alt="pdf_mini" src="/pdf.gif" /></a></span></td>
      <td><a href="${PDF_BASE}/2024/11/${file}_A1-1.pdf"><img alt="pdf_mini" src="/pdf.gif" /></a></td>
      <td></td>
      <td><strong>${observations}</strong></td>
    </tr>`;

  it('lee la cabecera real de la web («Cod. Plaza» en celdas td)', () => {
    const html = `<table><tbody>${REAL_HEADER}${realRow('IN000377', 'IN000377', 'RESUELTA')}</tbody></table>`;
    expect(parsePciListing(html, BASE_URL)).toEqual([
      {
        code: 'IN000377',
        department: 'Expresión Gráfica',
        center: 'Escuela de Ingenierías Industriales',
        observations: 'RESUELTA',
        deadline: null,
        stage: 'firstMinutes',
        documents: {
          call: `${PDF_BASE}/2024/10/IN000377_C.pdf`,
          firstMinutes: `${PDF_BASE}/2024/11/IN000377_A1-1.pdf`,
          secondMinutes: null,
        },
      },
    ]);
  });

  it('una tabla sin cabecera usa las columnas de la anterior', () => {
    const html = `
      <table>${REAL_HEADER}${realRow('IN000900', 'IN000900', 'DESIERTA')}</table>
      <table>${realRow('IN000448', 'IN000448', 'RESUELTA')}</table>`;
    expect(parsePciListing(html, BASE_URL)[1]).toMatchObject({
      code: 'IN000448',
      department: 'Expresión Gráfica',
      center: 'Escuela de Ingenierías Industriales',
      observations: 'RESUELTA',
      stage: 'firstMinutes',
    });
  });

  it('tolera las erratas de la web en el código de la celda o en el nombre del PDF', () => {
    const html = `<table>${REAL_HEADER}
      ${realRow('IN03300376', 'IN000376', 'RESUELTA')}
      ${realRow('IN000304', 'IN003004', 'RESUELTA')}</table>`;
    const positions = parsePciListing(html, BASE_URL);
    // El PDF mal nombrado es de la plaza de su fila: no crea otra plaza.
    expect(positions.map(({ code }) => code)).toEqual(['IN000376', 'IN000304']);
    expect(positions[0]?.department).toBe('Expresión Gráfica');
    expect(positions[1]?.documents.call).toBe(`${PDF_BASE}/2024/10/IN003004_C.pdf`);
  });

  it('devuelve una lista vacía si la página no tiene plazas', () => {
    expect(parsePciListing('<p>Página en mantenimiento</p>', BASE_URL)).toEqual([]);
  });
});
