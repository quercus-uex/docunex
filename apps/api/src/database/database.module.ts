import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.js';
import { createDataSourceOptions } from './data-source.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...createDataSourceOptions(config.get('DATABASE_URL', { infer: true })),
        // Herramienta personal: las migraciones pendientes se aplican al arrancar.
        migrationsRun: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
