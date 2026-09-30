import {
  type PositionDto,
  type SessionUser,
  type UexImportData,
  uexImportSchema,
  type UexPositionListDto,
  type UexSyncResult,
} from '@docunex/shared';
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { UexPositionsService } from './uex-positions.service.js';

@Controller('uex-positions')
export class UexPositionsController {
  constructor(private readonly uexPositions: UexPositionsService) {}

  /** Plazas publicadas en la web de la UEx. `?refresh=true` vuelve a leer la página. */
  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query('refresh') refresh?: string,
  ): Promise<UexPositionListDto> {
    return this.uexPositions.list(user.id, { fresh: refresh === 'true' });
  }

  @Post('import')
  import(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(uexImportSchema)) body: UexImportData,
  ): Promise<PositionDto[]> {
    return this.uexPositions.import(user.id, body.codes);
  }

  @Post('sync')
  @HttpCode(200)
  sync(@CurrentUser() user: SessionUser): Promise<UexSyncResult> {
    return this.uexPositions.sync(user.id);
  }
}
