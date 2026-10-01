import type { PositionDto, UexPositionListDto, UexSyncResult } from '@docunex/shared';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, loginAs, type TestApp } from './support/app.js';

/** Mismo puerto que `UEX_PCI_URL` en `vitest.config.e2e.ts`. */
const PORT = 39517;

describe('Plazas de la web de la UEx (e2e)', () => {
  let app: TestApp;
  let agent: TestAgent;
  let server: Server;
  /** Lo que sirve la «web de la UEx»: HTML o un código de error. */
  let page: string | number;
  let requests = 0;

  beforeAll(async () => {
    page = await readFile(
      new URL('../src/uex/__fixtures__/convocatorias-pci.html', import.meta.url),
      'utf8',
    );
    server = createServer((_request, response) => {
      requests++;
      if (typeof page === 'number') {
        response.writeHead(page).end('Solicitud bloqueada');
      } else {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(page);
      }
    });
    await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));
    app = await createTestApp();
    agent = await loginAs(app, 'ana@example.com');
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((resolve) => server?.close(resolve));
  });

  it('lista las plazas publicadas y reutiliza la lectura', async () => {
    const { body } = await agent.get('/api/uex-positions').expect(200);
    const listing = body as UexPositionListDto;
    expect(listing.source).toBe(`http://127.0.0.1:${PORT}/convocatorias-pci/`);
    expect(listing.positions).toHaveLength(10);
    expect(listing.positions[0]).toMatchObject({
      code: 'IN000939',
      department: 'Arte y Ciencias del Territorio',
      stage: 'call',
      deadline: '2026-10-01',
      positionId: null,
    });

    const before = requests;
    await agent.get('/api/uex-positions').expect(200);
    expect(requests).toBe(before);
    await agent.get('/api/uex-positions?refresh=true').expect(200);
    expect(requests).toBe(before + 1);
  });

  it('importa las plazas elegidas con su departamento, plazo y fase', async () => {
    const { body } = await agent
      .post('/api/uex-positions/import')
      .send({ codes: ['in000913', 'IN000928'] })
      .expect(201);
    const created = body as PositionDto[];
    expect(created.map((position) => position.code).sort()).toEqual(['IN000913', 'IN000928']);
    expect(created.find(({ code }) => code === 'IN000913')).toMatchObject({
      department: 'Ingenierías de Sistemas Informáticos y Telemáticos',
      center: 'Escuela Politécnica',
      deadline: '2026-10-01',
      resolutionDate: null,
      uexStatus: {
        stage: 'call',
        documents: { call: expect.stringMatching(/IN000913_C\.pdf$/) },
      },
    });

    // La lista de la UEx marca las que ya tiene el usuario.
    const { body: listing } = await agent.get('/api/uex-positions').expect(200);
    const imported = (listing as UexPositionListDto).positions.filter(
      ({ positionId }) => positionId,
    );
    expect(imported.map(({ code }) => code).sort()).toEqual(['IN000913', 'IN000928']);
  });

  it('no duplica las plazas que ya existen', async () => {
    const { body } = await agent
      .post('/api/uex-positions/import')
      .send({ codes: ['IN000913'] })
      .expect(201);
    expect(body).toEqual([]);
    const { body: positions } = await agent.get('/api/positions').expect(200);
    expect((positions as PositionDto[]).filter(({ code }) => code === 'IN000913')).toHaveLength(1);
  });

  it('rechaza códigos que no están en la web', async () => {
    const { body } = await agent
      .post('/api/uex-positions/import')
      .send({ codes: ['IN999999'] })
      .expect(400);
    expect(body.message).toContain('IN999999');
    await agent.post('/api/uex-positions/import').send({ codes: [] }).expect(400);
  });

  it('actualiza la fase de las plazas cuando la UEx publica un acta', async () => {
    await agent
      .post('/api/positions')
      .send({
        code: 'IN123456',
        resolutionDate: null,
        title: 'Manual',
        area: null,
        deadline: null,
        notes: null,
      })
      .expect(201);
    page = (page as string).replace(
      /(IN000913_C\.pdf"[\s\S]*?<\/td>\s*)<td><\/td>/,
      '$1<td><a href="/wp-content/uploads/IN000913_A1.pdf">Acta 1</a></td>',
    );
    expect(page).toContain('IN000913_A1.pdf');

    const { body } = await agent.post('/api/uex-positions/sync').expect(200);
    expect(body as UexSyncResult).toEqual({ updated: 2, missing: ['IN123456'] });

    const { body: positions } = await agent.get('/api/positions').expect(200);
    const byCode = new Map(
      (positions as PositionDto[]).map((position) => [position.code, position]),
    );
    expect(byCode.get('IN000913')?.uexStatus).toMatchObject({
      stage: 'firstMinutes',
      documents: { firstMinutes: `http://127.0.0.1:${PORT}/wp-content/uploads/IN000913_A1.pdf` },
    });
    expect(byCode.get('IN123456')?.uexStatus).toBeNull();
  });

  it('avisa si la web de la UEx no responde', async () => {
    page = 403;
    const { body } = await agent.post('/api/uex-positions/sync').expect(502);
    expect(body.message).toContain('HTTP 403');
  });

  it('las plazas de otro usuario no se ven', async () => {
    const other = await loginAs(app, 'otro@example.com');
    const { body } = await other.get('/api/positions').expect(200);
    expect(body).toEqual([]);
  });
});
