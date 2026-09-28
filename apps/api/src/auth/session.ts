import type { CookieOptions, Request } from 'express';
import type { SessionUser } from '@docunex/shared';
import type { Env } from '../config/env.js';

export const SESSION_COOKIE = 'docunex_session';

export type AuthenticatedRequest = Request & { user?: SessionUser };

export function sessionCookieOptions(
  env: Pick<Env, 'COOKIE_SECURE' | 'SESSION_TTL_DAYS'>,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}
