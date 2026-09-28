import {
  type PositionData,
  type PositionDto,
  positionInputSchema,
  type SessionUser,
} from '@docunex/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PositionsService } from './positions.service.js';

@Controller('positions')
export class PositionsController {
  constructor(private readonly positions: PositionsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser): Promise<PositionDto[]> {
    return this.positions.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(positionInputSchema)) body: PositionData,
  ): Promise<PositionDto> {
    return this.positions.create(user.id, body);
  }

  @Get(':id')
  get(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PositionDto> {
    return this.positions.get(user.id, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(positionInputSchema)) body: PositionData,
  ): Promise<PositionDto> {
    return this.positions.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.positions.remove(user.id, id);
  }
}
