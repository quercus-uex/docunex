import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from '../positions/position.entity.js';
import { UexListingService } from './uex-listing.service.js';
import { UexPositionsController } from './uex-positions.controller.js';
import { UexPositionsService } from './uex-positions.service.js';

/** Plazas PCI publicadas en la web de la Universidad de Extremadura. */
@Module({
  imports: [TypeOrmModule.forFeature([Position])],
  controllers: [UexPositionsController],
  providers: [UexListingService, UexPositionsService],
})
export class UexModule {}
