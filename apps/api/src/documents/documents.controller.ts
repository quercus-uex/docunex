import {
  type DocumentDto,
  type DocumentUsagesDto,
  listDocumentsQuerySchema,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  type SessionUser,
  type UpdateDocumentInput,
  updateDocumentSchema,
  uploadDocumentsBodySchema,
  type UploadResult,
} from '@docunex/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { contentDisposition } from '../common/content-disposition.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { DocumentsService } from './documents.service.js';

const fileQuerySchema = z.object({ variant: z.enum(['pdf', 'original']).default('pdf') });

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listDocumentsQuerySchema))
    query: z.output<typeof listDocumentsQuerySchema>,
  ): Promise<DocumentDto[]> {
    return this.documents.list(user.id, query);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_UPLOAD_FILES, {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      // Sin esto, multer decodifica los nombres como latin1 y "Título.pdf" llega mal.
      defParamCharset: 'utf8',
    }),
  )
  upload(
    @CurrentUser() user: SessionUser,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body(new ZodValidationPipe(uploadDocumentsBodySchema))
    body: z.output<typeof uploadDocumentsBodySchema>,
  ): Promise<UploadResult[]> {
    if (!files?.length) throw new BadRequestException('No se ha enviado ningún fichero');
    return this.documents.upload(user.id, files, body.kind);
  }

  @Get(':id')
  get(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentDto> {
    return this.documents.get(user.id, id);
  }

  @Get(':id/usages')
  usages(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentUsagesDto> {
    return this.documents.usages(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDocumentSchema)) body: UpdateDocumentInput,
  ): Promise<DocumentDto> {
    return this.documents.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.documents.remove(user.id, id);
  }

  @Post(':id/reprocess')
  @HttpCode(200)
  reprocess(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentDto> {
    return this.documents.reprocess(user.id, id);
  }

  @Get(':id/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  async file(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(fileQuerySchema)) query: z.output<typeof fileQuerySchema>,
  ): Promise<StreamableFile> {
    const file = await this.documents.openFile(user.id, id, query.variant);
    return new StreamableFile(file.stream, {
      type: file.mime,
      length: file.size,
      disposition: contentDisposition('inline', file.filename),
    });
  }
}
