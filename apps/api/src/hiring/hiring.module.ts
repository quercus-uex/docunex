import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/application.entity.js';
import { Document } from '../documents/document.entity.js';
import { Profile } from '../profile/profile.entity.js';
import { ProfileModule } from '../profile/profile.module.js';
import { ApplicationHiringDocument } from './application-hiring-document.entity.js';
import { HiringController } from './hiring.controller.js';
import { HiringService } from './hiring.service.js';

@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([Application, ApplicationHiringDocument, Document, Profile]),
  ],
  controllers: [HiringController],
  providers: [HiringService],
  exports: [HiringService],
})
export class HiringModule {}
