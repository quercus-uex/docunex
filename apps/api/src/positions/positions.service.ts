import type { PositionData, PositionDto } from '@docunex/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../applications/application.entity.js';
import { isUniqueViolation } from '../common/database-errors.js';
import { Position } from './position.entity.js';

export function toPositionDto(position: Position, applications: number): PositionDto {
  return {
    id: position.id,
    code: position.code,
    resolutionDate: position.resolutionDate,
    title: position.title,
    area: position.area,
    department: position.department,
    center: position.center,
    deadline: position.deadline,
    notes: position.notes,
    applications,
    uexStatus: position.uexStatus,
    createdAt: position.createdAt.toISOString(),
    updatedAt: position.updatedAt.toISOString(),
  };
}

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    @InjectRepository(Application) private readonly applications: Repository<Application>,
  ) {}

  /** Las de plazo más reciente primero; las que no tienen plazo, al final. */
  async list(userId: string): Promise<PositionDto[]> {
    const [positions, counts] = await Promise.all([
      this.positions
        .createQueryBuilder('position')
        .where({ userId })
        .orderBy('position.deadline', 'DESC', 'NULLS LAST')
        .addOrderBy('position.createdAt', 'DESC')
        .getMany(),
      this.applications
        .createQueryBuilder('application')
        .select('application.positionId', 'positionId')
        .addSelect('COUNT(*)::int', 'count')
        .where({ userId })
        .groupBy('application.positionId')
        .getRawMany<{ positionId: string; count: number }>(),
    ]);
    const byPosition = new Map(counts.map((row) => [row.positionId, row.count]));
    return positions.map((position) => toPositionDto(position, byPosition.get(position.id) ?? 0));
  }

  async get(userId: string, id: string): Promise<PositionDto> {
    const position = await this.findOwned(userId, id);
    return toPositionDto(position, await this.applications.countBy({ positionId: id }));
  }

  async create(userId: string, input: PositionData): Promise<PositionDto> {
    const position = await this.saveUnique(this.positions.create({ userId, ...input }));
    return toPositionDto(position, 0);
  }

  async update(userId: string, id: string, input: PositionData): Promise<PositionDto> {
    const position = await this.findOwned(userId, id);
    await this.saveUnique(Object.assign(position, input));
    return this.get(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    if (await this.applications.existsBy({ positionId: id })) {
      throw new ConflictException('La plaza tiene solicitudes: bórralas antes de borrar la plaza');
    }
    await this.positions.delete(id);
  }

  async findOwned(userId: string, id: string): Promise<Position> {
    const position = await this.positions.findOneBy({ id, userId });
    if (!position) throw new NotFoundException('Plaza no encontrada');
    return position;
  }

  private async saveUnique(position: Position): Promise<Position> {
    try {
      return await this.positions.save(position);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          statusCode: 409,
          message: `Ya tienes una plaza con el código ${position.code}`,
          issues: [{ path: 'code', message: 'Ya tienes una plaza con este código' }],
        });
      }
      throw error;
    }
  }
}
