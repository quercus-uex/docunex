import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationMerit } from '../applications/application-merit.entity.js';
import { ApplicationRequirementDocument } from '../applications/application-requirement-document.entity.js';
import { Application } from '../applications/application.entity.js';
import { Document } from '../documents/document.entity.js';
import { MeritDocument } from '../merits/merit-document.entity.js';
import { ProfileModule } from '../profile/profile.module.js';
import { GenerationEvents } from './generation-events.service.js';
import { GenerationProcessor } from './generation.processor.js';
import { PackageDocument } from './package-document.entity.js';
import { Package } from './package.entity.js';
import { PackagesController } from './packages.controller.js';
import { PackagesService } from './packages.service.js';
import { SnapshotService } from './snapshot.service.js';

@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([
      Package,
      PackageDocument,
      Application,
      ApplicationMerit,
      ApplicationRequirementDocument,
      MeritDocument,
      Document,
    ]),
  ],
  controllers: [PackagesController],
  providers: [SnapshotService, GenerationEvents, GenerationProcessor, PackagesService],
  exports: [SnapshotService, PackagesService],
})
export class GenerationModule {}
