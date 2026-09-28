import {
  type ApplicationDto,
  type DocumentDto,
  type DocumentKind,
  MERIT_EXAMPLES,
  type MeritDto,
  type MeritType,
  type PackageDto,
  type PositionDto,
  type UploadResult,
  type ValidationResult,
} from '@docunex/shared';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { extractPageTexts } from '../src/pdf/text.js';
import { createTestApp, loginAs, type TestApp, waitFor } from './support/app.js';
import { makePdf } from './support/fixtures.js';

describe('Plazas, solicitudes y generación (e2e)', () => {
  let app: TestApp;
  let agent: TestAgent;
  const documents: Record<string, DocumentDto> = {};
  const merits: Record<string, MeritDto> = {};
  let position: PositionDto;
  let application: ApplicationDto;

  async function upload(label: string, pages: number, kind: DocumentKind): Promise<DocumentDto> {
    const { body } = await agent
      .post('/api/documents')
      .field('kind', kind)
      .attach('files', await makePdf(pages, label), `${label}.pdf`)
      .expect(201);
    const [result] = body as UploadResult[];
    if (result?.status !== 'created') throw new Error(`No se subió ${label}`);
    const ready = await waitFor(async () => {
      const { body: document } = await agent.get(`/api/documents/${result.document.id}`);
      return (document as DocumentDto).status === 'ready' ? (document as DocumentDto) : undefined;
    });
    documents[label] = ready;
    return ready;
  }

  async function createMerit(
    key: string,
    type: MeritType,
    documentIds: string[],
    data: object = {},
  ): Promise<MeritDto> {
    const { body } = await agent
      .post('/api/merits')
      .send({ type, data: { ...MERIT_EXAMPLES[type], ...data }, notes: null, documentIds })
      .expect(201);
    merits[key] = body as MeritDto;
    return body as MeritDto;
  }

  beforeAll(async () => {
    app = await createTestApp();
    agent = await loginAs(app, 'ana@example.com');
    for (const [label, pages, kind] of [
      ['DNI', 1, 'identity'],
      ['Titulo', 2, 'degree'],
      ['Certificacion', 3, 'transcript'],
      ['Articulo', 4, 'publication'],
      ['Resolucion', 2, 'certificate'],
      ['Compartido', 1, 'contract'],
      ['Convenio', 1, 'contract'],
    ] as const) {
      await upload(label, pages, kind);
    }
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
    await createMerit('expediente', 'academic_record', [documents.Certificacion!.id]);
    await createMerit('articulo', 'article', [documents.Articulo!.id]);
    await createMerit('proyecto', 'project', [documents.Resolucion!.id, documents.Compartido!.id]);
    await createMerit('contrato', 'industry_contract', [
      documents.Compartido!.id,
      documents.Convenio!.id,
    ]);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  describe('plazas', () => {
    it('crea una plaza y valida su código', async () => {
      const { body } = await agent
        .post('/api/positions')
        .send({
          code: ' in123456 ',
          resolutionDate: '2026-09-15',
          title: 'Investigador',
          area: null,
          deadline: '',
          notes: null,
        })
        .expect(201);
      position = body as PositionDto;
      expect(position).toMatchObject({ code: 'IN123456', deadline: null, applications: 0 });

      const invalid = await agent
        .post('/api/positions')
        .send({ ...body, code: 'DPCI-1492' })
        .expect(400);
      expect(invalid.body.issues[0].path).toBe('code');
      const duplicate = await agent
        .post('/api/positions')
        .send({ ...body, code: 'IN123456' })
        .expect(409);
      expect(duplicate.body.issues).toEqual([
        { path: 'code', message: 'Ya tienes una plaza con este código' },
      ]);
    });
  });

  describe('solicitudes', () => {
    it('se crean con la fecha de hoy, los textos propuestos y todos los méritos', async () => {
      const { body } = await agent
        .post('/api/applications')
        .send({ positionId: position.id })
        .expect(201);
      application = body as ApplicationDto;
      expect(application).toMatchObject({
        status: 'draft',
        position: { code: 'IN123456', resolutionDate: '2026-09-15' },
        requirementDocumentIds: [],
        latestPackage: null,
      });
      expect(application.applicationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(application.expone).toContain('plaza IN123456');
      expect(new Set(application.meritIds)).toEqual(
        new Set(Object.values(merits).map((m) => m.id)),
      );

      const { body: positions } = await agent.get('/api/positions').expect(200);
      expect((positions as PositionDto[])[0]!.applications).toBe(1);
      await agent.delete(`/api/positions/${position.id}`).expect(409);
    });

    it('guarda la selección, los documentos de requisitos y los textos', async () => {
      const ids = [documents.Titulo!.id, documents.Certificacion!.id];
      await agent
        .put(`/api/applications/${application.id}/requirement-documents`)
        .send({ documentIds: ids })
        .expect(200);
      const order = ['contrato', 'proyecto', 'articulo', 'expediente'].map(
        (key) => merits[key]!.id,
      );
      await agent
        .put(`/api/applications/${application.id}/merits`)
        .send({ meritIds: order })
        .expect(200);
      const { body } = await agent
        .patch(`/api/applications/${application.id}`)
        .send({ applicationDate: '2026-09-28', solicita: '  Ser admitida.  ' })
        .expect(200);
      expect(body).toMatchObject({
        applicationDate: '2026-09-28',
        solicita: 'Ser admitida.',
        requirementDocumentIds: ids,
        meritIds: order,
      });
      await agent.patch(`/api/applications/${application.id}`).send({ expone: '' }).expect(400);
    });

    it('valida la solicitud antes de generar', async () => {
      const { body } = await agent
        .get(`/api/applications/${application.id}/validation`)
        .expect(200);
      const result = body as ValidationResult;
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sizeEstimate).toBeGreaterThan(300_000);
    });

    it('un documento de requisitos no se puede borrar y aparece en sus usos', async () => {
      const id = documents.Titulo!.id;
      const { body } = await agent.get(`/api/documents/${id}/usages`).expect(200);
      expect(body.applications).toEqual([{ id: application.id, positionCode: 'IN123456' }]);
      await agent.delete(`/api/documents/${id}`).expect(409);
      const { body: list } = await agent.get('/api/documents?unused=true').expect(200);
      expect((list as DocumentDto[]).map((d) => d.id)).not.toContain(id);
    });

    it('no admite méritos ni documentos de otro usuario', async () => {
      const other = await loginAs(app, 'luis@example.com');
      await other.get(`/api/applications/${application.id}`).expect(404);
      await other.post(`/api/applications/${application.id}/packages`).expect(404);
      const { body: otherPosition } = await other
        .post('/api/positions')
        .send({
          code: 'IN000001',
          resolutionDate: null,
          title: null,
          area: null,
          deadline: null,
          notes: null,
        })
        .expect(201);
      await agent
        .patch(`/api/applications/${application.id}`)
        .send({ positionId: otherPosition.id })
        .expect(404);
      await agent
        .put(`/api/applications/${application.id}/merits`)
        .send({ meritIds: ['00000000-0000-4000-8000-000000000000'] })
        .expect(400);
    });
  });

  describe('generación', () => {
    let pkg: PackageDto;

    it('genera el expediente completo con la numeración, las páginas y la autocomprobación', async () => {
      const { body: queued } = await agent
        .post(`/api/applications/${application.id}/packages`)
        .expect(202);
      expect(queued).toMatchObject({ version: 1, status: 'queued' });
      pkg = await waitFor(
        async () => {
          const { body } = await agent.get(`/api/packages/${queued.id}`).expect(200);
          return ['done', 'failed'].includes(body.status) ? (body as PackageDto) : undefined;
        },
        { timeoutMs: 60_000 },
      );
      expect(pkg.errors).toEqual([]);
      expect(pkg).toMatchObject({ status: 'done', warnings: [], progress: null });

      const code = (label: string) =>
        pkg.documents.find((d) => d.documentId === documents[label]!.id)?.code;
      expect(pkg.documents.map((d) => [d.code, d.block, d.name])).toEqual([
        [1, 5, 'Titulo'],
        [2, 5, 'Certificacion'],
        [3, 6, 'Articulo'],
        [4, 6, 'Resolucion'],
        [5, 6, 'Compartido'],
        [6, 6, 'Convenio'],
      ]);
      expect(code('Compartido')).toBe(5);

      const { body: file, headers } = await agent
        .get(`/api/packages/${pkg.id}/file`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['content-disposition']).toContain('Solicitud IN123456 - Fern');
      const pages = extractPageTexts(file as Buffer);
      expect(pages).toHaveLength(pkg.pageCount!);
      expect(pkg.size).toBe((file as Buffer).length);

      for (const document of pkg.documents) {
        expect(pages[document.startPage - 1]).toContain(`${document.name} - pagina 1`);
        expect(pages[document.startPage - 1]).toContain(
          `DOC_0${document.code} · 1/${document.pageCount}`,
        );
      }
      const text = pages.join(' ');
      expect(text).toContain('Nota Media del Expediente Doc. nº: DOC_02');
      expect(text).toContain('Participación en proyectos de investigación Doc. nº: DOC_04, DOC_05');
      expect(text).toContain(
        'Participación en contratos y convenios con empresas Doc. nº: DOC_05, DOC_06',
      );
      expect(text).toContain('Fecha: 28/09/2026');

      const { body: updated } = await agent.get(`/api/applications/${application.id}`).expect(200);
      expect(updated).toMatchObject({
        status: 'generated',
        latestPackage: { id: pkg.id, status: 'done' },
      });
    }, 90_000);

    it('informa del progreso por SSE hasta que termina', async () => {
      const response = await agent
        .get(`/api/packages/${pkg.id}/events`)
        .buffer(true)
        .parse((res, callback) => {
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => callback(null, data));
        })
        .expect(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      const events = (response.body as string)
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.slice(6)));
      expect(events).toEqual([expect.objectContaining({ id: pkg.id, status: 'done' })]);

      const other = await loginAs(app, 'luis@example.com');
      await other.get(`/api/packages/${pkg.id}/events`).expect(404);
      await other.get(`/api/packages/${pkg.id}/file`).expect(404);
    });

    it('si no pasa la validación, el expediente falla con los errores', async () => {
      await agent
        .put(`/api/positions/${position.id}`)
        .send({
          code: 'IN123456',
          resolutionDate: null,
          title: null,
          area: null,
          deadline: null,
          notes: null,
        })
        .expect(200);
      const { body: queued } = await agent
        .post(`/api/applications/${application.id}/packages`)
        .expect(202);
      expect(queued.version).toBe(2);
      const failed = await waitFor(async () => {
        const { body } = await agent.get(`/api/packages/${queued.id}`);
        return body.status === 'failed' ? (body as PackageDto) : undefined;
      });
      expect(failed.errors.map((issue) => issue.code)).toEqual(['POSITION_RESOLUTION_DATE']);
    });

    it('solo se registra con un expediente bien generado y después queda bloqueada', async () => {
      const entry = { number: 'REGAGE26e00012345678', registeredAt: '2026-09-28T10:15:00.000Z' };
      const url = `/api/applications/${application.id}`;

      // La última versión falló (prueba anterior).
      const { body: failedLast } = await agent
        .post(`${url}/registry-entries`)
        .send(entry)
        .expect(409);
      expect(failedLast.message).toContain('vuelve a generarlo');

      await agent
        .put(`/api/positions/${position.id}`)
        .send({
          code: 'IN123456',
          resolutionDate: '2026-09-15',
          title: null,
          area: null,
          deadline: null,
          notes: null,
        })
        .expect(200);
      const { body: queued } = await agent.post(`${url}/packages`).expect(202);
      await waitFor(
        async () => {
          const { body } = await agent.get(`/api/packages/${queued.id}`);
          return body.status === 'done' ? true : undefined;
        },
        { timeoutMs: 60_000 },
      );

      await agent.post(`${url}/registry-entries`).send({ number: ' ' }).expect(400);
      const { body: registered } = await agent
        .post(`${url}/registry-entries`)
        .send({ ...entry, notes: 'Justificante guardado' })
        .expect(201);
      expect(registered).toMatchObject({
        status: 'registered',
        registryEntries: [
          {
            number: entry.number,
            registeredAt: entry.registeredAt,
            notes: 'Justificante guardado',
            packageId: queued.id,
            packageVersion: 3,
          },
        ],
      });

      // Bloqueada: ni textos, ni selección, ni regenerar, ni un segundo registro.
      await agent.patch(url).send({ expone: 'Otro texto' }).expect(409);
      await agent.put(`${url}/merits`).send({ meritIds: [] }).expect(409);
      await agent.put(`${url}/requirement-documents`).send({ documentIds: [] }).expect(409);
      await agent.post(`${url}/packages`).expect(409);
      await agent.post(`${url}/registry-entries`).send(entry).expect(409);
      // El expediente registrado se sigue pudiendo descargar.
      await agent.get(`/api/packages/${queued.id}/file`).expect(200);

      // El asiento se puede corregir.
      const entryId = registered.registryEntries[0].id as string;
      const { body: corrected } = await agent
        .patch(`${url}/registry-entries/${entryId}`)
        .send({ ...entry, number: 'REGAGE26e00012345679' })
        .expect(200);
      expect(corrected.registryEntries[0]).toMatchObject({
        number: 'REGAGE26e00012345679',
        notes: null,
      });
      const other = await loginAs(app, 'luis@example.com');
      await other.patch(`${url}/registry-entries/${entryId}`).send(entry).expect(404);
      await other.patch(`${url}/status`).send({ status: 'closed' }).expect(404);

      // Cerrar y reabrir; no se vuelve a borrador.
      await agent.patch(`${url}/status`).send({ status: 'draft' }).expect(400);
      const { body: closed } = await agent
        .patch(`${url}/status`)
        .send({ status: 'closed' })
        .expect(200);
      expect(closed.status).toBe('closed');
      await agent.patch(url).send({ expone: 'Otro texto' }).expect(409);
      await agent.patch(`${url}/status`).send({ status: 'closed' }).expect(409);
      const { body: reopened } = await agent
        .patch(`${url}/status`)
        .send({ status: 'registered' })
        .expect(200);
      expect(reopened.status).toBe('registered');
    }, 90_000);

    it('una solicitud en borrador no se puede registrar ni cerrar', async () => {
      const { body: draft } = await agent
        .post('/api/applications')
        .send({ positionId: position.id })
        .expect(201);
      const { body } = await agent
        .post(`/api/applications/${draft.id}/registry-entries`)
        .send({ number: '1', registeredAt: '2026-09-28T10:15:00+02:00' })
        .expect(409);
      expect(body.message).toBe('Genera el expediente antes de registrarlo');
      await agent
        .patch(`/api/applications/${draft.id}/status`)
        .send({ status: 'closed' })
        .expect(409);
    });

    it('al borrar el usuario se borra todo', async () => {
      const dataSource = app.get(DataSource);
      await dataSource.query(`DELETE FROM users WHERE email = 'ana@example.com'`);
      const [{ count }] = await dataSource.query(
        `SELECT (SELECT count(*) FROM applications) + (SELECT count(*) FROM packages WHERE user_id NOT IN (SELECT id FROM users)) + (SELECT count(*) FROM registry_entries) AS count`,
      );
      expect(Number(count)).toBe(0);
      await request(app.getHttpServer()).get('/api/applications').expect(401);
    });
  });
});
