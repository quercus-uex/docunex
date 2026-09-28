import {
  type ApplicationDto,
  applicationMeritsSchema,
  createApplicationSchema,
  type PackageSummaryDto,
  requirementDocumentsSchema,
  type SessionUser,
  updateApplicationSchema,
  type ValidationResult,
} from '@docunex/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ApplicationsService } from './applications.service.js';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser): Promise<ApplicationDto[]> {
    return this.applications.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createApplicationSchema))
    body: z.output<typeof createApplicationSchema>,
  ): Promise<ApplicationDto> {
    return this.applications.create(user.id, body.positionId);
  }

  @Get(':id')
  get(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationDto> {
    return this.applications.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateApplicationSchema))
    body: z.output<typeof updateApplicationSchema>,
  ): Promise<ApplicationDto> {
    return this.applications.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.applications.remove(user.id, id);
  }

  @Put(':id/merits')
  setMerits(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(applicationMeritsSchema))
    body: z.output<typeof applicationMeritsSchema>,
  ): Promise<ApplicationDto> {
    return this.applications.setMerits(user.id, id, body.meritIds);
  }

  @Put(':id/requirement-documents')
  setRequirementDocuments(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(requirementDocumentsSchema))
    body: z.output<typeof requirementDocumentsSchema>,
  ): Promise<ApplicationDto> {
    return this.applications.setRequirementDocuments(user.id, id, body.documentIds);
  }

  @Get(':id/validation')
  validate(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ValidationResult> {
    return this.applications.validate(user.id, id);
  }

  /** Encola la generación de una versión nueva del expediente (`202`). */
  @Post(':id/packages')
  @HttpCode(202)
  generate(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PackageSummaryDto> {
    return this.applications.generate(user.id, id);
  }
}
