import type { DocumentDto, ProfileDto, ProfileInput, UploadResult } from '@docunex/shared';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, loginAs, type TestApp } from './support/app.js';
import { makeJpeg } from './support/fixtures.js';

const input: ProfileInput = {
  lastNames: 'García López',
  firstName: 'Ana',
  dni: '12345678-z',
  birthDate: '1990-04-12',
  address: 'Avda. de Elvas, s/n',
  postalCode: '06006',
  city: 'Badajoz',
  province: 'Badajoz',
  email: 'Ana@Example.com',
  phone: '+34 924 000 000',
  degree: 'Grado en Ingeniería Informática',
  idDocumentId: null,
  degreeVerifications: [
    { degreeName: 'Grado en Ingeniería Informática', code: 'https://example.org/verifica/ABC' },
    { degreeName: 'Máster en Ingeniería Informática', code: 'XYZ-123' },
  ],
};

/** Sube una copia del DNI; `width` distinto por llamada para que no sea un duplicado. */
async function uploadIdCopy(agent: TestAgent, width = 600): Promise<DocumentDto> {
  const { body } = await agent
    .post('/api/documents')
    .field('kind', 'identity')
    .attach('files', await makeJpeg(width, 400), 'dni.jpg')
    .expect(201);
  const [result] = body as UploadResult[];
  if (result.status !== 'created')
    throw new Error(`No se subió la copia del DNI: ${JSON.stringify(result)}`);
  return result.document;
}

describe('Perfil (e2e)', () => {
  let app: TestApp;
  let agent: TestAgent;

  beforeAll(async () => {
    app = await createTestApp();
    agent = await loginAs(app, 'ana@example.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('devuelve un perfil vacío si aún no existe', async () => {
    const { body } = await agent.get('/api/profile').expect(200);
    expect(body).toMatchObject({
      lastNames: null,
      dni: null,
      degreeVerifications: [],
      updatedAt: null,
    });
  });

  it('guarda el perfil normalizando los datos', async () => {
    const idCopy = await uploadIdCopy(agent);
    expect(idCopy.kind).toBe('identity');

    const { body } = await agent
      .put('/api/profile')
      .send({ ...input, idDocumentId: idCopy.id })
      .expect(200);
    const profile = body as ProfileDto;
    expect(profile).toMatchObject({
      dni: '12345678Z',
      email: 'ana@example.com',
      idDocumentId: idCopy.id,
    });
    expect(
      profile.degreeVerifications.map(({ degreeName, code }) => ({ degreeName, code })),
    ).toEqual(input.degreeVerifications);
    expect(profile.updatedAt).not.toBeNull();
    expect((await agent.get('/api/profile').expect(200)).body).toEqual(profile);
  });

  it('sustituye la lista de verificaciones de títulos', async () => {
    const { body } = await agent
      .put('/api/profile')
      .send({ ...input, degreeVerifications: [input.degreeVerifications[1]] })
      .expect(200);
    expect((body as ProfileDto).degreeVerifications.map((item) => item.code)).toEqual(['XYZ-123']);
  });

  it('valida el DNI, el código postal y la fecha', async () => {
    const { body } = await agent
      .put('/api/profile')
      .send({ ...input, dni: '12345678A', postalCode: '6006', birthDate: '12/04/1990' })
      .expect(400);
    expect(body.issues.map((issue: { path: string }) => issue.path).sort()).toEqual([
      'birthDate',
      'dni',
      'postalCode',
    ]);
  });

  it('no admite como copia del DNI un documento de otro usuario', async () => {
    const other = await loginAs(app, 'otra@example.com');
    const foreign = await uploadIdCopy(other);
    await agent
      .put('/api/profile')
      .send({ ...input, idDocumentId: foreign.id })
      .expect(400);
  });

  it('al borrar la copia del DNI, el perfil queda sin ella', async () => {
    const idCopy = await uploadIdCopy(agent, 640);
    await agent
      .put('/api/profile')
      .send({ ...input, idDocumentId: idCopy.id })
      .expect(200);
    await agent.delete(`/api/documents/${idCopy.id}`).expect(204);
    expect(
      ((await agent.get('/api/profile').expect(200)).body as ProfileDto).idDocumentId,
    ).toBeNull();
  });
});
