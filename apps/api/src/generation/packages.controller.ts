import type { PackageDto, PackageSummaryDto, SessionUser } from '@docunex/shared';
import {
  Controller,
  Get,
  Header,
  type MessageEvent,
  Param,
  ParseUUIDPipe,
  Sse,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { contentDisposition } from '../common/content-disposition.js';
import { GenerationEvents } from './generation-events.service.js';
import { PackagesService } from './packages.service.js';

const finished = (pkg: PackageSummaryDto) => pkg.status === 'done' || pkg.status === 'failed';

@Controller('packages')
export class PackagesController {
  constructor(
    private readonly packages: PackagesService,
    private readonly events: GenerationEvents,
  ) {}

  @Get(':id')
  get(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PackageDto> {
    return this.packages.get(user.id, id);
  }

  /**
   * Progreso de la generación (Server-Sent Events): el estado actual y después cada cambio, hasta
   * que termina. Cada evento es un `PackageSummaryDto`.
   */
  @Sse(':id/events')
  async events$(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Observable<MessageEvent>> {
    // Comprueba la propiedad antes de abrir el flujo, para responder 404 si no es suyo.
    await this.packages.get(user.id, id);
    return new Observable<MessageEvent>((subscriber) => {
      const send = (pkg: PackageSummaryDto) => {
        subscriber.next({ data: pkg });
        if (finished(pkg)) subscriber.complete();
      };
      // Primero la suscripción, luego el estado actual: así no se pierde ningún cambio intermedio.
      const subscription = this.events.of(id).subscribe(send);
      this.packages.get(user.id, id).then(
        ({ layout: _layout, documents: _documents, ...summary }) => send(summary),
        (error: unknown) => subscriber.error(error),
      );
      return () => subscription.unsubscribe();
    });
  }

  @Get(':id/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  async file(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.packages.openFile(user.id, id);
    return new StreamableFile(file.stream, {
      type: 'application/pdf',
      length: file.size,
      disposition: contentDisposition('inline', file.filename),
    });
  }
}
