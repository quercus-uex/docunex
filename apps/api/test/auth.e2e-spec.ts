import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UsersService } from '../src/users/users.service.js';
import { createTestApp, type TestApp } from './support/app.js';

const EMAIL = 'ana@example.com';
const PASSWORD = 'contraseña-segura';

describe('Autenticación (e2e)', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
    await app.get(UsersService).upsertWithPassword(EMAIL, PASSWORD);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health es público', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' });
  });

  it('GET /api/auth/me sin sesión devuelve 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rechaza una contraseña incorrecta', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'incorrecta' })
      .expect(401);
  });

  it('valida el cuerpo del login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'no-es-correo' })
      .expect(400);
    expect(res.body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'email' })]),
    );
  });

  it('inicia sesión, consulta el usuario y cierra la sesión', async () => {
    const agent = request.agent(app.getHttpServer());

    const login = await agent
      .post('/api/auth/login')
      .send({ email: '  ANA@example.com ', password: PASSWORD })
      .expect(200);
    expect(login.body).toMatchObject({ email: EMAIL });
    const cookie = String(login.headers['set-cookie']);
    expect(cookie).toContain('docunex_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body).toEqual({ id: login.body.id, email: EMAIL });

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });
});
