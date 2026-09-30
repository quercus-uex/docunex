import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity.js';
import { GenerationModule } from '../generation/generation.module.js';
import { HiringModule } from '../hiring/hiring.module.js';
import { Merit } from '../merits/merit.entity.js';
import { PositionsModule } from '../positions/positions.module.js';
import { ApplicationMerit } from './application-merit.entity.js';
import { ApplicationRequirementDocument } from './application-requirement-document.entity.js';
import { Application } from './application.entity.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { RegistryEntry } from './registry-entry.entity.js';

@Module({
  imports: [
    PositionsModule,
    GenerationModule,
    HiringModule,
    TypeOrmModule.forFeature([
      Application,
      ApplicationMerit,
      ApplicationRequirementDocument,
      RegistryEntry,
      Merit,
      Document,
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
