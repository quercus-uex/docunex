import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity.js';
import { MeritDocument } from './merit-document.entity.js';
import { Merit } from './merit.entity.js';
import { MeritsController } from './merits.controller.js';
import { MeritsService } from './merits.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Merit, MeritDocument, Document])],
  controllers: [MeritsController],
  providers: [MeritsService],
})
export class MeritsModule {}
