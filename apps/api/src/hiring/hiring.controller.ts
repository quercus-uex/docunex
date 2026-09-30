import {
  type HiringDocumentKey,
  hiringDocumentKeySchema,
  hiringDocumentsSchema,
  type HiringDto,
  type SessionUser,
} from '@docunex/shared';
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Put,
  StreamableFile,
} from '@nestjs/common';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { contentDisposition } from '../common/content-disposition.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { HiringService } from './hiring.service.js';

/** Segunda fase de una solicitud: documentación para formalizar el contrato. */
@Controller('applications/:id/hiring')
export class HiringController {
  constructor(private readonly hiring: HiringService) {}

  @Get()
  get(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HiringDto> {
    return this.hiring.get(user.id, id);
  }

  /** Documentos vinculados a una entrada de la lista (`HIRING_DOCUMENTS`), en su orden. */
  @Put('documents/:key')
  setDocuments(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('key', new ZodValidationPipe(hiringDocumentKeySchema)) key: HiringDocumentKey,
    @Body(new ZodValidationPipe(hiringDocumentsSchema))
    body: z.output<typeof hiringDocumentsSchema>,
  ): Promise<HiringDto> {
    return this.hiring.setDocuments(user.id, id, key, body.documentIds);
  }

  /** PDF con la portada (datos y relación de documentos) y los documentos de la segunda fase. */
  @Get('file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  async file(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.hiring.buildFile(user.id, id);
    return new StreamableFile(file.data, {
      type: 'application/pdf',
      length: file.data.length,
      disposition: contentDisposition('inline', file.filename),
    });
  }
}
