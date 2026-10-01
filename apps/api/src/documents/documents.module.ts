import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationRequirementDocument } from '../applications/application-requirement-document.entity.js';
import { MeritDocument } from '../merits/merit-document.entity.js';
import { ApplicationHiringDocument } from '../hiring/application-hiring-document.entity.js';
import { Profile } from '../profile/profile.entity.js';
import { DocumentProcessor } from './document-processor.service.js';
import { Document } from './document.entity.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      MeritDocument,
      ApplicationRequirementDocument,
      ApplicationHiringDocument,
      Profile,
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
