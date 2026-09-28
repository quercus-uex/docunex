import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Env } from '../config/env.js';
import { StorageService } from './storage.service.js';

const KEY_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?(\/[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?)*$/;

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.root = path.resolve(config.get('STORAGE_DIR', { infer: true }));
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    // Escritura atómica: un fichero a medias nunca queda con el nombre definitivo.
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, data);
    await rename(temporary, target);
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async stream(key: string) {
    const target = this.resolve(key);
    const { size } = await stat(target);
    return { stream: createReadStream(target), size };
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  private resolve(key: string): string {
    if (!KEY_PATTERN.test(key)) {
      throw new Error(`Clave de almacenamiento no válida: ${key}`);
    }
    return path.join(this.root, key);
  }
}
