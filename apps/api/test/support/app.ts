import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import type { Env } from '../../src/config/env.js';
import { UsersService } from '../../src/users/users.service.js';

export type TestApp = INestApplication<App>;

/** Arranca la aplicación completa contra la base de datos de pruebas, vacía. */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication<TestApp>());
  await app.init();
  await app.get(DataSource).query('TRUNCATE TABLE users CASCADE');
  const storageDir = app.get<ConfigService<Env, true>>(ConfigService).get('STORAGE_DIR', {
    infer: true,
  });
  await rm(storageDir, { recursive: true, force: true });
  return app;
}

/** Crea un usuario y devuelve un agente de supertest con su sesión iniciada. */
export async function loginAs(app: TestApp, email: string) {
  const password = 'contraseña-de-prueba';
  await app.get(UsersService).upsertWithPassword(email, password);
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
}

/** Espera a que se cumpla una condición asíncrona (p. ej. que termine un trabajo en segundo plano). */
export async function waitFor<T>(
  check: () => Promise<T | undefined>,
  { timeoutMs = 15_000, intervalMs = 100 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error('Tiempo de espera agotado');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
