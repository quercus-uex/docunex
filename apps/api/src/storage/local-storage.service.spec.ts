import type { ConfigService } from '@nestjs/config';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { text } from 'node:stream/consumers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Env } from '../config/env.js';
import { LocalStorageService } from './local-storage.service.js';

describe('LocalStorageService', () => {
  let root: string;
  let storage: LocalStorageService;

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'docunex-storage-'));
    const config = { get: () => root } as unknown as ConfigService<Env, true>;
    storage = new LocalStorageService(config);
  });

  afterAll(() => rm(root, { recursive: true, force: true }));

  it('guarda, lee y borra ficheros', async () => {
    const key = 'user-1/originals/abc.pdf';
    await storage.put(key, Buffer.from('hola'));
    expect((await storage.read(key)).toString()).toBe('hola');

    const { stream, size } = await storage.stream(key);
    expect(size).toBe(4);
    expect(await text(stream)).toBe('hola');

    await storage.delete(key);
    await expect(storage.read(key)).rejects.toThrow();
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it('no deja ficheros temporales', async () => {
    await storage.put('user-1/pdf/doc.pdf', Buffer.from('x'));
    expect(await readdir(path.join(root, 'user-1/pdf'))).toEqual(['doc.pdf']);
  });

  it.each(['../fuera.pdf', 'a/../../b', '/absoluta', 'a//b', 'a/./b', ''])(
    'rechaza la clave %j',
    async (key) => {
      await expect(storage.put(key, Buffer.from('x'))).rejects.toThrow('no válida');
    },
  );
});
