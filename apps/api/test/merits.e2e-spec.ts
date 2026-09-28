import {
  type DocumentDto,
  type DocumentUsagesDto,
  getMeritType,
  MERIT_EXAMPLES,
  MERIT_TYPES,
  type MeritDto,
  type MeritInput,
  type UploadResult,
} from '@docunex/shared';
import type TestAgent from 'supertest/lib/agent.js';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, loginAs, type TestApp } from './support/app.js';
import { makePdf } from './support/fixtures.js';

async function uploadPdf(agent: TestAgent, label: string): Promise<DocumentDto> {
  const { body } = await agent
    .post('/api/documents')
    .attach('files', await makePdf(1, label), `${label}.pdf`)
    .expect(201);
  const [result] = body as UploadResult[];
  if (result.status !== 'created') throw new Error(`No se subió ${label}`);
  return result.document;
}

function input(type: MeritInput['type'], documentIds: string[] = []): MeritInput {
  return { type, data: { ...MERIT_EXAMPLES[type] }, notes: null, documentIds };
}

describe('Méritos (e2e)', () => {
  let app: TestApp;
  let agent: TestAgent;
  let certificate: DocumentDto;
  let paper: DocumentDto;

  beforeAll(async () => {
    app = await createTestApp();
    agent = await loginAs(app, 'ana@example.com');
    certificate = await uploadPdf(agent, 'Certificado');
    paper = await uploadPdf(agent, 'Artículo');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('crea un mérito de cada tipo y lo sitúa en su apartado del CV', async () => {
    for (const type of MERIT_TYPES) {
      const { body } = await agent.post('/api/merits').send(input(type)).expect(201);
      const merit = body as MeritDto;
      const def = getMeritType(type);
      const data = def.schema.parse(MERIT_EXAMPLES[type]);
      expect(merit).toMatchObject({
        type,
        schemaVersion: 1,
        cvSection: def.cvSection(data),
        sortDate: def.sortDate(data),
        summary: def.summary(data),
        documents: [],
      });
    }
    const { body } = await agent.get('/api/merits').expect(200);
    expect(body).toHaveLength(MERIT_TYPES.length);
  });

  it('valida los datos con el esquema de su tipo', async () => {
    const { body } = await agent
      .post('/api/merits')
      .send({
        ...input('article'),
        data: { ...MERIT_EXAMPLES.article, quartile: null, year: 1800 },
      })
      .expect(400);
    expect(body.issues).toEqual(
      expect.arrayContaining([
        { path: 'data.year', message: 'Año no válido' },
        { path: 'data.quartile', message: 'Obligatorio' },
      ]),
    );
  });

  it('guarda los justificantes en orden y los cambia al editar', async () => {
    const { body: created } = await agent
      .post('/api/merits')
      .send({ ...input('article', [paper.id, certificate.id]), notes: '  Revisar cuartil  ' })
      .expect(201);
    const merit = created as MeritDto;
    expect(merit.notes).toBe('Revisar cuartil');
    expect(merit.documents.map((document) => document.id)).toEqual([paper.id, certificate.id]);
    expect(merit.cvSection).toBe('4.c.3.a');

    const { body: updated } = await agent
      .put(`/api/merits/${merit.id}`)
      .send({
        ...input('article', [certificate.id]),
        data: { ...MERIT_EXAMPLES.article, indexed: false, quartile: null },
      })
      .expect(200);
    expect(updated).toMatchObject({
      cvSection: '4.c.3.b',
      notes: null,
      documents: [{ id: certificate.id, name: 'Certificado' }],
    });
    expect((updated as MeritDto).data).toMatchObject({ index: null, quartile: null });
  });

  it('filtra por tipo y por apartado (incluidos los subapartados)', async () => {
    const byType = (await agent.get('/api/merits?type=grant').expect(200)).body as MeritDto[];
    expect(byType.map((merit) => merit.type)).toEqual(['grant']);

    const bySection = (await agent.get('/api/merits?section=4.c').expect(200)).body as MeritDto[];
    expect(new Set(bySection.map((merit) => merit.cvSection))).toEqual(
      new Set(['4.c.1', '4.c.2', '4.c.3.a', '4.c.3.b']),
    );
    await agent.get('/api/merits?section=9').expect(400);
  });

  it('ordena del más reciente al más antiguo, con los que no tienen fecha al final', async () => {
    const merits = (await agent.get('/api/merits').expect(200)).body as MeritDto[];
    const dates = merits.map((merit) => merit.sortDate);
    const firstNull = dates.indexOf(null);
    const dated = dates.slice(0, firstNull) as string[];
    expect(dated).toEqual([...dated].sort().reverse());
    expect(dates.slice(firstNull).every((date) => date === null)).toBe(true);
  });

  it('informa de dónde se usa cada documento y filtra los que no se usan', async () => {
    const orphan = await uploadPdf(agent, 'Sin uso');
    const documents = (await agent.get('/api/documents').expect(200)).body as DocumentDto[];
    const usage = Object.fromEntries(documents.map((document) => [document.name, document.usage]));
    expect(usage).toEqual({
      Certificado: { merits: 1, applications: 0, idDocument: false },
      Artículo: { merits: 0, applications: 0, idDocument: false },
      'Sin uso': { merits: 0, applications: 0, idDocument: false },
    });

    const unused = (await agent.get('/api/documents?unused=true').expect(200))
      .body as DocumentDto[];
    expect(unused.map((document) => document.id).sort()).toEqual([orphan.id, paper.id].sort());

    const { body } = await agent.get(`/api/documents/${certificate.id}/usages`).expect(200);
    expect(body).toEqual({
      merits: [expect.objectContaining({ type: 'article', cvSection: '4.c.3.b' })],
      idDocument: false,
      applications: [],
    } satisfies DocumentUsagesDto);
  });

  it('no deja borrar un documento que justifica un mérito', async () => {
    const { body } = await agent.delete(`/api/documents/${certificate.id}`).expect(409);
    expect(body.usages.merits).toHaveLength(1);

    const merit = body.usages.merits[0] as { id: string };
    await agent.delete(`/api/merits/${merit.id}`).expect(204);
    await agent.get(`/api/merits/${merit.id}`).expect(404);
    await agent.delete(`/api/documents/${certificate.id}`).expect(204);
  });

  it('solo admite como justificantes documentos propios', async () => {
    const other = await loginAs(app, 'luis@example.com');
    const foreign = await uploadPdf(other, 'Ajeno');
    const { body } = await agent
      .post('/api/merits')
      .send(input('language', [foreign.id]))
      .expect(400);
    expect(body.message).toBe('Los justificantes deben ser documentos tuyos');
  });

  it('aísla los méritos de cada usuario', async () => {
    const [merit] = (await agent.get('/api/merits').expect(200)).body as MeritDto[];
    const other = await loginAs(app, 'luis@example.com');
    expect((await other.get('/api/merits').expect(200)).body).toEqual([]);
    await other.get(`/api/merits/${merit!.id}`).expect(404);
    await other.put(`/api/merits/${merit!.id}`).send(input('language')).expect(404);
    await other.delete(`/api/merits/${merit!.id}`).expect(404);
  });

  it('al borrar un usuario se borran sus méritos y documentos', async () => {
    await agent
      .post('/api/merits')
      .send(input('patent', [paper.id]))
      .expect(201);
    const dataSource = app.get(DataSource);
    await dataSource.query(`DELETE FROM users WHERE email = 'ana@example.com'`);
    const [{ count }] = await dataSource.query(
      `SELECT count(*)::int AS count FROM merit_documents WHERE document_id = $1`,
      [paper.id],
    );
    expect(count).toBe(0);
  });
});
