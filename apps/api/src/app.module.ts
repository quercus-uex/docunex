import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationsModule } from './applications/applications.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { HiringModule } from './hiring/hiring.module.js';
import { HealthController } from './health/health.controller.js';
import { JobsModule } from './jobs/jobs.module.js';
import { GenerationModule } from './generation/generation.module.js';
import { MeritsModule } from './merits/merits.module.js';
import { PositionsModule } from './positions/positions.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    JobsModule,
    StorageModule,
    UsersModule,
    AuthModule,
    DocumentsModule,
    ProfileModule,
    MeritsModule,
    PositionsModule,
    GenerationModule,
    ApplicationsModule,
    HiringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
