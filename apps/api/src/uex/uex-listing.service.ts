import type { UexPosition } from '@docunex/shared';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { parsePciListing } from './pci-listing.parser.js';

export interface UexListing {
  source: string;
  fetchedAt: Date;
  positions: UexPosition[];
}

/** La página cambia pocas veces al día: se reutiliza la última lectura durante este tiempo. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;

/** Lee (y guarda en memoria) la lista de plazas PCI publicada en la web de la UEx. */
@Injectable()
export class UexListingService {
  private readonly logger = new Logger(UexListingService.name);
  private readonly url: string;
  private cached: UexListing | null = null;
  private pending: Promise<UexListing> | null = null;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('UEX_PCI_URL', { infer: true });
  }

  /** Con `fresh` se ignora la copia en memoria y se vuelve a leer la página. */
  async get({ fresh = false } = {}): Promise<UexListing> {
    if (!fresh && this.cached && Date.now() - this.cached.fetchedAt.getTime() < CACHE_TTL_MS) {
      return this.cached;
    }
    // Varias peticiones a la vez comparten la misma descarga.
    this.pending ??= this.fetchListing().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async fetchListing(): Promise<UexListing> {
    let html: string;
    try {
      const response = await fetch(this.url, {
        headers: {
          Accept: 'text/html',
          'Accept-Language': 'es-ES,es;q=0.9',
          'User-Agent':
            'Mozilla/5.0 (compatible; DocUNEx; +https://github.com/quercus-uex/docunex)',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new BadGatewayException(
          `La web de la UEx ha respondido con un error (HTTP ${response.status})`,
        );
      }
      html = await response.text();
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.warn(`No se pudo leer ${this.url}: ${String(error)}`);
      throw new BadGatewayException('No se pudo conectar con la web de la UEx');
    }

    const positions = parsePciListing(html, this.url);
    if (positions.length === 0) {
      throw new BadGatewayException(
        'La página de convocatorias de la UEx no tiene ninguna plaza reconocible: puede que haya cambiado de formato',
      );
    }
    this.cached = { source: this.url, fetchedAt: new Date(), positions };
    return this.cached;
  }
}
