import { Body, Controller, Get, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type LoginInput, loginSchema, type SessionUser } from '@docunex/shared';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { SESSION_COOKIE, sessionCookieOptions } from './session.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const user = await this.auth.validateCredentials(body.email, body.password);
    if (!user) throw new UnauthorizedException('Correo o contraseña incorrectos');

    res.cookie(SESSION_COOKIE, await this.auth.signSession(user), this.cookieOptions());
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    const { maxAge: _maxAge, ...options } = this.cookieOptions();
    res.clearCookie(SESSION_COOKIE, options);
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  private cookieOptions() {
    return sessionCookieOptions({
      COOKIE_SECURE: this.config.get('COOKIE_SECURE', { infer: true }),
      SESSION_TTL_DAYS: this.config.get('SESSION_TTL_DAYS', { infer: true }),
    });
  }
}
