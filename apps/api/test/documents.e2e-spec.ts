import type { DocumentDto, UploadResult } from '@docunex/shared';
import { PDFDocument } from 'pdf-lib';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, loginAs, type TestApp, waitFor } from './support/app.js';
import { encryptPdf, makeJpeg, makePdf } from './support/fixtures.js';

type Agent = TestAgent;

async function waitProcessed(agent: Agent, id: string): Promise<DocumentDto> {
  return waitFor(async () => {
    const { body } = await agent.get(`/api/documents/${id}`).expect(200);
    const document = body as DocumentDto;
    return document.status === 'processing' ? undefined : document;
  });
}

function byFilename(results: UploadResult[], filename: string) {
  const result = results.find((item) => item.filename === filename);
  if (!result) throw new Error(`Sin resultado para ${filename}`);
  return result;
}

describe('Documentos (e2e)', () => {
  let app: TestApp;
  let agent: Agent;
  let results: UploadResult[];
  // pdf-lib incrusta la fecha de creación: para probar duplicados hay que reenviar los mismos bytes.
  let gradePdf: Buffer;

  beforeAll(async () => {
    app = await createTestApp();
    agent = await loginAs(app, 'ana@example.com');

    gradePdf = await makePdf(3);
    const response = await agent
      .post('/api/documents')
      .attach('files', gradePdf, 'Título de grado.pdf')
      .attach(
        'files',
        encryptPdf(await makePdf(2), { ownerPassword: 'propietario' }),
        'cifrado.pdf',
      )
      .attach(
        'files',
        encryptPdf(await makePdf(1), { ownerPassword: 'propietario', userPassword: 'usuario' }),
        'con-clave.pdf',
      )
      .attach('files', await makeJpeg(1240, 1754), 'escaneo.jpg')
      .attach('files', Buffer.from('solo texto'), 'notas.txt')
      .expect(201);
    results = response.body as UploadResult[];
  });

  afterAll(async () => {
    await app?.close();
  });

  it('acepta PDFs e imágenes y rechaza otros formatos', () => {
    expect(results.map(({ filename, status }) => [filename, status])).toEqual([
      ['Título de grado.pdf', 'created'],
      ['cifrado.pdf', 'created'],
      ['con-clave.pdf', 'created'],
      ['escaneo.jpg', 'created'],
      ['notas.txt', 'rejected'],
    ]);
  });

  it('conserva los nombres con tildes y propone el nombre del documento', () => {
    const result = byFilename(results, 'Título de grado.pdf');
    expect(result.status === 'created' && result.document.name).toBe('Título de grado');
  });

  it('normaliza un PDF normal, uno cifrado solo con clave de propietario y una imagen', async () => {
    for (const [filename, pages] of [
      ['Título de grado.pdf', 3],
      ['cifrado.pdf', 2],
      ['escaneo.jpg', 1],
    ] as const) {
      const result = byFilename(results, filename);
      if (result.status !== 'created') throw new Error(filename);
      const document = await waitProcessed(agent, result.document.id);
      expect(document, filename).toMatchObject({ status: 'ready', pageCount: pages });

      const file = await agent
        .get(`/api/documents/${document.id}/file`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200)
        .expect('Content-Type', 'application/pdf');
      expect((await PDFDocument.load(file.body as Buffer)).getPageCount()).toBe(pages);
    }
  });

  it('marca como error un PDF con contraseña de apertura', async () => {
    const result = byFilename(results, 'con-clave.pdf');
    if (result.status !== 'created') throw new Error('con-clave.pdf');
    const document = await waitProcessed(agent, result.document.id);
    expect(document.status).toBe('error');
    expect(document.errorMessage).toMatch(/contraseña de apertura/);

    // Reprocesar vuelve a fallar igual, pero pasa por "processing".
    await agent.post(`/api/documents/${document.id}/reprocess`).expect(200);
    expect((await waitProcessed(agent, document.id)).status).toBe('error');
  });

  it('no duplica un fichero ya subido', async () => {
    const original = byFilename(results, 'Título de grado.pdf');
    if (original.status !== 'created') throw new Error();
    const before = (await agent.get('/api/documents').expect(200)).body as DocumentDto[];

    const { body } = await agent
      .post('/api/documents')
      .attach('files', gradePdf, 'otra-copia.pdf')
      .expect(201);
    expect(body).toEqual([
      expect.objectContaining({
        status: 'duplicate',
        document: expect.objectContaining({ id: original.document.id }),
      }),
    ]);

    const after = (await agent.get('/api/documents').expect(200)).body as DocumentDto[];
    expect(after).toHaveLength(before.length);
  });

  it('filtra por texto y por tipo', async () => {
    const found = (await agent.get('/api/documents?q=título').expect(200)).body as DocumentDto[];
    expect(found.map((document) => document.originalFilename)).toEqual(['Título de grado.pdf']);
    const none = (await agent.get('/api/documents?kind=degree').expect(200)).body as DocumentDto[];
    expect(none).toEqual([]);
  });

  it('edita nombre, tipo y fecha de emisión', async () => {
    const result = byFilename(results, 'escaneo.jpg');
    if (result.status !== 'created') throw new Error();
    const { body } = await agent
      .patch(`/api/documents/${result.document.id}`)
      .send({ name: 'Certificado de servicios', kind: 'certificate', issuedAt: '2024-05-17' })
      .expect(200);
    expect(body).toMatchObject({
      name: 'Certificado de servicios',
      kind: 'certificate',
      issuedAt: '2024-05-17',
    });

    await agent
      .patch(`/api/documents/${result.document.id}`)
      .send({ kind: 'desconocido' })
      .expect(400);
  });

  it('aísla los documentos de cada usuario', async () => {
    const other = await loginAs(app, 'otra@example.com');
    const result = byFilename(results, 'cifrado.pdf');
    if (result.status !== 'created') throw new Error();

    expect((await other.get('/api/documents').expect(200)).body).toEqual([]);
    await other.get(`/api/documents/${result.document.id}`).expect(404);
    await other.get(`/api/documents/${result.document.id}/file`).expect(404);
    await other.delete(`/api/documents/${result.document.id}`).expect(404);
  });

  it('borra el documento y sus ficheros', async () => {
    const result = byFilename(results, 'cifrado.pdf');
    if (result.status !== 'created') throw new Error();
    await agent.delete(`/api/documents/${result.document.id}`).expect(204);
    await agent.get(`/api/documents/${result.document.id}`).expect(404);

    // Se puede volver a subir: ya no cuenta como duplicado.
    const { body } = await agent
      .post('/api/documents')
      .attach('files', encryptPdf(await makePdf(2), { ownerPassword: 'otra' }), 'cifrado.pdf')
      .expect(201);
    expect((body as UploadResult[])[0].status).toBe('created');
  });

  it('exige al menos un fichero', async () => {
    await agent.post('/api/documents').field('kind', 'other').expect(400);
  });
});
