import type { Readable } from 'node:stream';

/** Almacén de ficheros por clave (`{userId}/originals/{sha256}.pdf`). Hoy en disco; mañana, S3. */
export abstract class StorageService {
  abstract put(key: string, data: Uint8Array): Promise<void>;
  abstract read(key: string): Promise<Buffer>;
  abstract stream(key: string): Promise<{ stream: Readable; size: number }>;
  /** No falla si la clave no existe. */
  abstract delete(key: string): Promise<void>;
}
