import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import type { Env } from '../config/env.js';

/** Cola de trabajos (pg-boss) sobre la misma base de datos PostgreSQL. */
@Injectable()
export class JobsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(JobsService.name);
  readonly boss: PgBoss;

  constructor(config: ConfigService<Env, true>) {
    this.boss = new PgBoss({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      schema: 'pgboss',
    });
    this.boss.on('error', (error) => this.logger.error(error.message, error.stack));
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.boss.start();
    this.logger.log('Cola de trabajos iniciada');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.boss.stop({ graceful: true });
  }
}
