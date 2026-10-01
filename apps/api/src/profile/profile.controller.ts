import {
  type HiringData,
  type HiringDataDto,
  hiringDataInputSchema,
  type ProfileData,
  type ProfileDto,
  profileInputSchema,
  type SessionUser,
} from '@docunex/shared';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ProfileService } from './profile.service.js';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  get(@CurrentUser() user: SessionUser): Promise<ProfileDto> {
    return this.profiles.get(user.id);
  }

  @Put()
  update(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(profileInputSchema)) body: ProfileData,
  ): Promise<ProfileDto> {
    return this.profiles.update(user.id, body);
  }

  /** Datos para la contratación (segunda fase): IBAN, NUSS, nacionalidad… */
  @Get('hiring')
  getHiring(@CurrentUser() user: SessionUser): Promise<HiringDataDto> {
    return this.profiles.getHiringData(user.id);
  }

  @Put('hiring')
  updateHiring(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(hiringDataInputSchema)) body: HiringData,
  ): Promise<HiringDataDto> {
    return this.profiles.updateHiringData(user.id, body);
  }
}
