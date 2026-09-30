import {
  type ApplicationDto,
  type DocumentDto,
  type DocumentKind,
  HIRING_DOCUMENTS,
  type HiringDataDto,
  type HiringDto,
  type UploadResult,
} from '@docunex/shared';
import type TestAgent from 'supertest/lib/agent.js';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { extractPageTexts } from '../src/pdf/text.js';
import { createTestApp, loginAs, type TestApp, waitFor } from './support/app.js';
import { makePdf } from './support/fixtures.js';

const hiringData = {
  iban: 'es91 2100 0418 4502 0005 1332',
  socialSecurityNumber: '28/12345678/40',
  nationality: 'Española',
  birthPlace: 'Cáceres',
};

describe('Segunda fase: contratación (e2e)', () => {
  let app: TestApp;
  let agent: TestAgent;
  let application: ApplicationDto;
  const documents: Record<string, DocumentDto> = {};

  async function upload(label: string, pages: number, kind: DocumentKind): Promise<DocumentDto> {
    const { body } = await agent
      .post('/api/documents')
      .field('kind', kind)
      .attach('files', await makePdf(pages, label), `${label}.pdf`)
      .expect(201);
    const [result] = body as UploadResult[];
    if (result?.status !== 'created') throw new Error(`No se subió ${label}`);
    documents[label] = await waitFor(async () => {
      const { body: document } = await agent.get(`/api/documents/${result.document.id}`);
      return (document as DocumentDto).status === 'ready' ? (document as DocumentDto) : undefined;
    });
    return documents[label]!;
  }

  const url = () => `/api/applications/${application.id}/hiring`;

  beforeAll(async () => {
    app = await createTestApp();
    agent = await loginAs(app, 'ana@example.com');
    for (const [label, pages, kind] of [
      ['DNI', 1, 'identity'],
      ['Banco', 1, 'certificate'],
      ['SeguridadSocial', 2, 'certificate'],
      ['Titulo', 1, 'degree'],
      ['Declaracion', 1, 'declaration'],
    ] as const) {
      await upload(label, pages, kind);
    }
    const { body: position } = await agent
      .post('/api/positions')
      .send({
        code: 'IN654321',
        resolutionDate: '2026-09-15',
        title: 'Investigador/a',
        area: null,
        deadline: null,
        notes: null,
      })
      .expect(201);
    ({ body: application } = await agent
      .post('/api/applications')
      .send({ positionId: position.id })
      .expect(201));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  describe('datos para el contrato en el perfil', () => {
    it('empiezan vacíos', async () => {
      const { body } = await agent.get('/api/profile/hiring').expect(200);
      expect(body).toEqual({
        iban: null,
        socialSecurityNumber: null,
        nationality: null,
        birthPlace: null,
        updatedAt: null,
      });
    });

    it('valida el IBAN y el NUSS', async () => {
      const { body } = await agent
        .put('/api/profile/hiring')
        .send({ ...hiringData, iban: 'ES9121000418450200051333', socialSecurityNumber: '1234' })
        .expect(400);
      expect(body.issues.map((issue: { path: string }) => issue.path).sort()).toEqual([
        'iban',
        'socialSecurityNumber',
      ]);
    });

    it('se guardan normalizados y no se pierden al guardar el resto del perfil', async () => {
      const { body } = await agent.put('/api/profile/hiring').send(hiringData).expect(200);
      expect(body as HiringDataDto).toMatchObject({
        iban: 'ES9121000418450200051332',
        socialSecurityNumber: '281234567840',
        nationality: 'Española',
        birthPlace: 'Cáceres',
      });

      await agent
        .put('/api/profile')
        .send({
          lastNames: 'Fernández Gómez',
          firstName: 'Lucía',
          dni: '12345678Z',
          birthDate: '1995-03-14',
          address: 'C/ Ejemplo, 12',
          postalCode: '10003',
          city: 'Cáceres',
          province: 'Cáceres',
          email: 'lucia@example.com',
          phone: '600000000',
          degree: 'Grado en Ingeniería Informática',
          idDocumentId: documents.DNI!.id,
          degreeVerifications: [],
        })
        .expect(200);
      const { body: profile } = await agent.get('/api/profile').expect(200);
      expect(profile).not.toHaveProperty('iban');
      const { body: again } = await agent.get('/api/profile/hiring').expect(200);
      expect(again.iban).toBe('ES9121000418450200051332');
    });
  });

  describe('documentación de la solicitud', () => {
    it('antes de registrar se consulta, pero no se modifica', async () => {
      const { body } = await agent.get(url()).expect(200);
      const hiring = body as HiringDto;
      expect(hiring.editable).toBe(false);
      expect(hiring.status.items.map((item) => item.key)).toEqual(
        HIRING_DOCUMENTS.map((item) => item.key),
      );
      expect(application.hiring).toBeNull();
      const { body: conflict } = await agent
        .put(`${url()}/documents/identity`)
        .send({ documentIds: [documents.DNI!.id] })
        .expect(409);
      expect(conflict.message).toContain('registrada');
      await agent.get(`${url()}/file`).expect(409);
    });

    it('registrada, se vinculan los documentos y se calcula el estado', async () => {
      // El registro completo (generar y anotar el nº) está probado en applications.e2e-spec.ts.
      await app
        .get(DataSource)
        .query(`UPDATE applications SET status = 'registered' WHERE id = $1`, [application.id]);

      const { body } = await agent
        .put(`${url()}/documents/identity`)
        .send({ documentIds: [documents.DNI!.id] })
        .expect(200);
      let hiring = body as HiringDto;
      expect(hiring.editable).toBe(true);
      expect(hiring.status.items[0]).toMatchObject({
        key: 'identity',
        status: 'complete',
        documentIds: [documents.DNI!.id],
      });
      expect(hiring.status.missingData).toEqual([]);
      expect(hiring.status.requiredDone).toBe(1);
      expect(hiring.status.complete).toBe(false);

      for (const [key, labels] of [
        ['bank_account', ['Banco']],
        ['social_security', ['SeguridadSocial']],
        ['degree', ['Titulo']],
        ['no_separation', ['Declaracion']],
        ['incompatibility', ['Declaracion']],
        ['irpf_145', ['Declaracion']],
      ] as const) {
        ({ body: hiring } = await agent
          .put(`${url()}/documents/${key}`)
          .send({ documentIds: labels.map((label) => documents[label]!.id) })
          .expect(200));
      }
      expect(hiring.status.complete).toBe(true);
      expect(hiring.status.requiredDone).toBe(hiring.status.requiredTotal);

      const { body: list } = await agent.get('/api/applications').expect(200);
      expect((list as ApplicationDto[])[0]!.hiring).toEqual({
        requiredDone: hiring.status.requiredTotal,
        requiredTotal: hiring.status.requiredTotal,
        complete: true,
      });
    });

    it('valida la entrada y los documentos', async () => {
      await agent.put(`${url()}/documents/otra`).send({ documentIds: [] }).expect(400);
      await agent
        .put(`${url()}/documents/identity`)
        .send({ documentIds: [documents.DNI!.id, documents.DNI!.id] })
        .expect(400);
      const other = await loginAs(app, 'luis@example.com');
      const { body } = await other
        .post('/api/documents')
        .attach('files', await makePdf(1, 'Ajeno'), 'ajeno.pdf')
        .expect(201);
      const [foreign] = body as UploadResult[];
      if (foreign?.status !== 'created') throw new Error('No se subió el documento ajeno');
      await agent
        .put(`${url()}/documents/identity`)
        .send({ documentIds: [foreign.document.id] })
        .expect(400);
      await other.get(url()).expect(404);
      await other.get(`${url()}/file`).expect(404);
    });

    it('un documento vinculado no se puede borrar y aparece en sus usos', async () => {
      const id = documents.Banco!.id;
      const { body } = await agent.get(`/api/documents/${id}/usages`).expect(200);
      expect(body.applications).toEqual([
        { id: application.id, positionCode: 'IN654321', role: 'hiring' },
      ]);
      // La declaración cubre tres entradas, pero es una sola solicitud.
      const { body: declaration } = await agent
        .get(`/api/documents/${documents.Declaracion!.id}`)
        .expect(200);
      expect(declaration.usage.applications).toBe(1);
      await agent.delete(`/api/documents/${id}`).expect(409);
      const { body: unused } = await agent.get('/api/documents?unused=true').expect(200);
      expect((unused as DocumentDto[]).map((document) => document.id)).not.toContain(id);
    });

    it('genera el PDF con la portada y los documentos', async () => {
      const { body: file, headers } = await agent
        .get(`${url()}/file`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['content-disposition']).toContain('Contrataci');
      const pages = extractPageTexts(file as Buffer);
      // Portada + DNI (1) + banco (1) + Seguridad Social (2) + título (1) + declaración ×3.
      expect(pages).toHaveLength(1 + 1 + 1 + 2 + 1 + 3);
      expect(pages[0]).toContain('Código de la plaza IN654321');
      expect(pages[0]).toContain('IBAN (cuenta para la nómina) ES91 2100 0418 4502 0005 1332');
      expect(pages[0]).toContain('Nº de afiliación a la Seguridad Social 28/12345678/40');
      expect(pages[0]).toContain('Autorización de residencia y trabajo (si procede) No se adjunta');
      expect(pages[1]).toContain('DNI - pagina 1');
      expect(pages[3]).toContain('SeguridadSocial - pagina 1');
    });

    it('cerrada, se consulta y se descarga, pero no se modifica', async () => {
      await agent
        .patch(`/api/applications/${application.id}/status`)
        .send({ status: 'closed' })
        .expect(200);
      const { body } = await agent.get(url()).expect(200);
      expect((body as HiringDto).editable).toBe(false);
      const { body: conflict } = await agent
        .put(`${url()}/documents/identity`)
        .send({ documentIds: [] })
        .expect(409);
      expect(conflict.message).toContain('cerrada');
      await agent.get(`${url()}/file`).expect(200);
    });

    it('al borrar la solicitud se borran los vínculos y el documento se puede borrar', async () => {
      await agent.delete(`/api/applications/${application.id}`).expect(204);
      await agent.delete(`/api/documents/${documents.Banco!.id}`).expect(204);
      const [{ count }] = await app
        .get(DataSource)
        .query(`SELECT count(*) FROM application_hiring_documents`);
      expect(Number(count)).toBe(0);
    });
  });
});
