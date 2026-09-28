import {
  type CvSectionCode,
  getMeritType,
  type MeritDto,
  type MeritInputData,
  type MeritType,
} from '@docunex/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Document } from '../documents/document.entity.js';
import { MeritDocument } from './merit-document.entity.js';
import { Merit } from './merit.entity.js';
import { toMeritDto } from './merit.mapper.js';

@Injectable()
export class MeritsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Merit) private readonly merits: Repository<Merit>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
  ) {}

  /** Méritos del más reciente al más antiguo; los que no tienen fecha, al final. */
  async list(
    userId: string,
    filters: { type?: MeritType; section?: CvSectionCode },
  ): Promise<MeritDto[]> {
    const query = this.merits
      .createQueryBuilder('merit')
      .leftJoinAndSelect('merit.documents', 'link')
      .leftJoinAndSelect('link.document', 'document')
      .where('merit.userId = :userId', { userId })
      .orderBy('merit.sortDate', 'DESC', 'NULLS LAST')
      .addOrderBy('merit.createdAt', 'DESC')
      .addOrderBy('link.position', 'ASC');
    if (filters.type) query.andWhere('merit.type = :type', { type: filters.type });
    if (filters.section) {
      query.andWhere('(merit.cvSection = :section OR merit.cvSection LIKE :prefix)', {
        section: filters.section,
        prefix: `${filters.section}.%`,
      });
    }
    return (await query.getMany()).map(toMeritDto);
  }

  async get(userId: string, id: string): Promise<MeritDto> {
    return toMeritDto(await this.findOwned(userId, id));
  }

  async create(userId: string, input: MeritInputData): Promise<MeritDto> {
    await this.assertOwnDocuments(userId, input.documentIds);
    const id = await this.dataSource.transaction(async (manager) => {
      const merit = await manager.save(manager.create(Merit, { userId, ...derived(input) }));
      await replaceDocuments(manager.getRepository(MeritDocument), merit.id, input.documentIds);
      return merit.id;
    });
    return this.get(userId, id);
  }

  /** Sustituye el mérito completo, incluida la lista de justificantes. */
  async update(userId: string, id: string, input: MeritInputData): Promise<MeritDto> {
    const merit = await this.findOwned(userId, id);
    await this.assertOwnDocuments(userId, input.documentIds);
    await this.dataSource.transaction(async (manager) => {
      delete merit.documents;
      await manager.save(Object.assign(merit, derived(input)));
      await replaceDocuments(manager.getRepository(MeritDocument), merit.id, input.documentIds);
    });
    return this.get(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const { affected } = await this.merits.delete({ id, userId });
    if (!affected) throw new NotFoundException('Mérito no encontrado');
  }

  private async findOwned(userId: string, id: string): Promise<Merit> {
    const merit = await this.merits.findOne({
      where: { id, userId },
      relations: { documents: { document: true } },
      order: { documents: { position: 'ASC' } },
    });
    if (!merit) throw new NotFoundException('Mérito no encontrado');
    return merit;
  }

  private async assertOwnDocuments(userId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const count = await this.documents.countBy({ userId, id: In(ids) });
    if (count !== ids.length) {
      throw new BadRequestException('Los justificantes deben ser documentos tuyos');
    }
  }
}

/** Columnas que se guardan a partir de la entrada validada. */
function derived(input: MeritInputData) {
  const def = getMeritType(input.type);
  return {
    type: input.type,
    data: input.data,
    schemaVersion: def.version,
    cvSection: def.cvSection(input.data),
    sortDate: def.sortDate(input.data),
    notes: input.notes,
  };
}

async function replaceDocuments(
  links: Repository<MeritDocument>,
  meritId: string,
  documentIds: string[],
): Promise<void> {
  await links.delete({ meritId });
  if (documentIds.length > 0) {
    await links.insert(
      documentIds.map((documentId, position) => ({ meritId, documentId, position })),
    );
  }
}
