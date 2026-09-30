import type {
  PositionDto,
  PositionUexStatus,
  UexPosition,
  UexPositionListDto,
  UexSyncResult,
} from '@docunex/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Position } from '../positions/position.entity.js';
import { toPositionDto } from '../positions/positions.service.js';
import { UexListingService } from './uex-listing.service.js';

function uexStatus(listed: UexPosition, syncedAt: Date): PositionUexStatus {
  return {
    stage: listed.stage,
    documents: listed.documents,
    observations: listed.observations,
    syncedAt: syncedAt.toISOString(),
  };
}

/** Plazas del usuario a partir de las publicadas en la web de la UEx. */
@Injectable()
export class UexPositionsService {
  constructor(
    private readonly listing: UexListingService,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
  ) {}

  async list(userId: string, { fresh = false } = {}): Promise<UexPositionListDto> {
    const [listing, owned] = await Promise.all([
      this.listing.get({ fresh }),
      this.positions.find({ where: { userId }, select: { id: true, code: true } }),
    ]);
    const byCode = new Map(owned.map((position) => [position.code, position.id]));
    return {
      source: listing.source,
      fetchedAt: listing.fetchedAt.toISOString(),
      positions: listing.positions.map((listed) => ({
        ...listed,
        positionId: byCode.get(listed.code) ?? null,
      })),
    };
  }

  /** Crea las plazas elegidas con los datos de la web. Las que el usuario ya tiene se dejan como están. */
  async import(userId: string, codes: string[]): Promise<PositionDto[]> {
    const listing = await this.listing.get();
    const listed = new Map(listing.positions.map((position) => [position.code, position]));
    const unknown = codes.filter((code) => !listed.has(code));
    if (unknown.length > 0) {
      throw new BadRequestException(`No están en la web de la UEx: ${unknown.join(', ')}`);
    }

    const existing = new Set(
      (
        await this.positions.find({ where: { userId, code: In(codes) }, select: { code: true } })
      ).map((position) => position.code),
    );
    const created = [...new Set(codes)]
      .filter((code) => !existing.has(code))
      .map((code) => {
        const position = listed.get(code)!;
        return this.positions.create({
          userId,
          code,
          department: position.department,
          center: position.center,
          deadline: position.deadline,
          resolutionDate: null,
          title: null,
          area: null,
          notes: null,
          uexStatus: uexStatus(position, listing.fetchedAt),
        });
      });
    if (created.length === 0) return [];
    // `orIgnore`: si otra petición crea la misma plaza a la vez, no se duplica ni falla.
    await this.positions.createQueryBuilder().insert().values(created).orIgnore().execute();
    const saved = await this.positions.findBy({
      userId,
      code: In(created.map(({ code }) => code)),
    });
    return saved.map((position) => toPositionDto(position, 0));
  }

  /**
   * Vuelve a leer la web y actualiza la fase de las plazas del usuario. Los datos que falten
   * (departamento, centro, fin del plazo) se completan; los que ya tienen valor no se tocan.
   */
  async sync(userId: string): Promise<UexSyncResult> {
    const listing = await this.listing.get({ fresh: true });
    const listed = new Map(listing.positions.map((position) => [position.code, position]));
    const owned = await this.positions.findBy({ userId });

    const updated: Position[] = [];
    const missing: string[] = [];
    for (const position of owned) {
      const found = listed.get(position.code);
      if (!found) {
        missing.push(position.code);
        continue;
      }
      position.uexStatus = uexStatus(found, listing.fetchedAt);
      position.department ??= found.department;
      position.center ??= found.center;
      position.deadline ??= found.deadline;
      updated.push(position);
    }
    await this.positions.save(updated);
    return { updated: updated.length, missing: missing.sort() };
  }
}
