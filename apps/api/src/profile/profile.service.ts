import type { HiringData, HiringDataDto, ProfileData, ProfileDto } from '@docunex/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Document } from '../documents/document.entity.js';
import { DegreeVerification } from './degree-verification.entity.js';
import { Profile } from './profile.entity.js';

@Injectable()
export class ProfileService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    @InjectRepository(DegreeVerification)
    private readonly verifications: Repository<DegreeVerification>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
  ) {}

  async get(userId: string): Promise<ProfileDto> {
    const [profile, verifications] = await Promise.all([
      this.profiles.findOneBy({ userId }),
      this.verifications.find({ where: { userId }, order: { position: 'ASC' } }),
    ]);
    return toProfileDto(profile, verifications);
  }

  /** Sustituye el perfil completo, incluida la lista de verificaciones de títulos. */
  async update(userId: string, input: ProfileData): Promise<ProfileDto> {
    const { degreeVerifications, ...fields } = input;
    if (
      fields.idDocumentId &&
      !(await this.documents.existsBy({ id: fields.idDocumentId, userId }))
    ) {
      throw new BadRequestException('La copia del DNI debe ser uno de tus documentos');
    }

    await this.dataSource.transaction(async (manager) => {
      const profiles = manager.getRepository(Profile);
      const profile = (await profiles.findOneBy({ userId })) ?? profiles.create({ userId });
      await profiles.save(Object.assign(profile, fields));

      await manager.delete(DegreeVerification, { userId });
      if (degreeVerifications.length > 0) {
        await manager.insert(
          DegreeVerification,
          degreeVerifications.map((verification, position) => ({
            userId,
            ...verification,
            position,
          })),
        );
      }
    });
    return this.get(userId);
  }

  /** Datos para la contratación (segunda fase). */
  async getHiringData(userId: string): Promise<HiringDataDto> {
    return toHiringDataDto(await this.profiles.findOneBy({ userId }));
  }

  /** Sustituye los datos de la contratación; el resto del perfil no cambia. */
  async updateHiringData(userId: string, input: HiringData): Promise<HiringDataDto> {
    const profile = (await this.profiles.findOneBy({ userId })) ?? this.profiles.create({ userId });
    return toHiringDataDto(await this.profiles.save(Object.assign(profile, input)));
  }
}

function toHiringDataDto(profile: Profile | null): HiringDataDto {
  return {
    iban: profile?.iban ?? null,
    socialSecurityNumber: profile?.socialSecurityNumber ?? null,
    nationality: profile?.nationality ?? null,
    birthPlace: profile?.birthPlace ?? null,
    updatedAt: profile?.updatedAt.toISOString() ?? null,
  };
}

function toProfileDto(profile: Profile | null, verifications: DegreeVerification[]): ProfileDto {
  return {
    lastNames: profile?.lastNames ?? null,
    firstName: profile?.firstName ?? null,
    dni: profile?.dni ?? null,
    birthDate: profile?.birthDate ?? null,
    address: profile?.address ?? null,
    postalCode: profile?.postalCode ?? null,
    city: profile?.city ?? null,
    province: profile?.province ?? null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    degree: profile?.degree ?? null,
    idDocumentId: profile?.idDocumentId ?? null,
    degreeVerifications: verifications.map(({ id, degreeName, code }) => ({
      id,
      degreeName,
      code,
    })),
    updatedAt: profile?.updatedAt.toISOString() ?? null,
  };
}
