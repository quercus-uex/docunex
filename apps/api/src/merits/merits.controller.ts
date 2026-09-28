import {
  listMeritsQuerySchema,
  type MeritDto,
  meritInputSchema,
  type MeritInputData,
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
  Query,
} from '@nestjs/common';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { MeritsService } from './merits.service.js';

@Controller('merits')
export class MeritsController {
  constructor(private readonly merits: MeritsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listMeritsQuerySchema))
    query: z.output<typeof listMeritsQuerySchema>,
  ): Promise<MeritDto[]> {
    return this.merits.list(user.id, query);
  }

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(meritInputSchema)) body: MeritInputData,
  ): Promise<MeritDto> {
    return this.merits.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string): Promise<MeritDto> {
    return this.merits.get(user.id, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(meritInputSchema)) body: MeritInputData,
  ): Promise<MeritDto> {
    return this.merits.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.merits.remove(user.id, id);
  }
}
