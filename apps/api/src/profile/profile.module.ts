import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity.js';
import { DegreeVerification } from './degree-verification.entity.js';
import { ProfileController } from './profile.controller.js';
import { Profile } from './profile.entity.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, DegreeVerification, Document])],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
