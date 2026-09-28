import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import type { Env } from '../config/env.js';

export interface WorkerOptions {
  /** Trabajos de esta cola que se procesan a la vez en este proceso. */
  concurrency?: number;
}

/** Cola de trabajos (pg-boss) sobre la misma base de datos PostgreSQL. */
@Injectable()
export class JobsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(JobsService.name);
  private readonly boss: PgBoss;
  private started?: Promise<unknown>;
  private readonly queues = new Map<string, Promise<void>>();

  constructor(config: ConfigService<Env, true>) {
    this.boss = new PgBoss({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      schema: 'pgboss',
      // Los workers reciben los trabajos nuevos al instante en lugar de esperar al siguiente sondeo.
      useListenNotify: true,
    });
    this.boss.on('error', (error) => this.logger.error(error.message, error.stack));
  }

  // Se arranca en onModuleInit para que esté lista antes de que los módulos registren sus workers
  // en onApplicationBootstrap.
  onModuleInit(): void {
    this.started = this.boss.start().then(() => this.logger.log('Cola de trabajos iniciada'));
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.started) await this.boss.stop({ graceful: true });
  }

  async send<T extends object>(queue: string, data: T): Promise<void> {
    await this.ensureQueue(queue);
    await this.boss.send(queue, data);
  }

  /**
   * Registra el procesador de una cola. Los fallos no se reintentan: el procesador debe capturar
   * sus errores y dejar constancia de ellos (p. ej. en el estado de la entidad).
   */
  async work<T extends object>(
    queue: string,
    handler: (data: T) => Promise<void>,
    { concurrency = 1 }: WorkerOptions = {},
  ): Promise<void> {
    await this.ensureQueue(queue);
    await this.boss.work<T>(queue, { localConcurrency: concurrency }, async (jobs) => {
      for (const job of jobs) await handler(job.data);
    });
  }

  private ensureQueue(queue: string): Promise<void> {
    let ready = this.queues.get(queue);
    if (!ready) {
      ready = (async () => {
        await this.started;
        await this.boss.createQueue(queue, { notify: true, retryLimit: 0 });
      })();
      this.queues.set(queue, ready);
    }
    return ready;
  }
}
