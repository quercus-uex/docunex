import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentProcessor } from './document-processor.service.js';
import { Document } from './document.entity.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
