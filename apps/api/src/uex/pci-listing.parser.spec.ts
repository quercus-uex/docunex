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

  it('devuelve una lista vacía si la página no tiene plazas', () => {
    expect(parsePciListing('<p>Página en mantenimiento</p>', BASE_URL)).toEqual([]);
  });
});
