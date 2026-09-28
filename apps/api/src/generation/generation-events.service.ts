import type { PackageSummaryDto } from '@docunex/shared';
import { Injectable } from '@nestjs/common';
import { filter, type Observable, Subject } from 'rxjs';

/** Avisos de progreso de la generación, para el SSE. El worker corre en el mismo proceso que la API. */
@Injectable()
export class GenerationEvents {
  private readonly events = new Subject<PackageSummaryDto>();

  emit(pkg: PackageSummaryDto): void {
    this.events.next(pkg);
  }

  of(packageId: string): Observable<PackageSummaryDto> {
    return this.events.pipe(filter((pkg) => pkg.id === packageId));
  }
}
