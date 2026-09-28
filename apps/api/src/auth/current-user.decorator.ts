import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SessionUser } from '@docunex/shared';
import type { AuthenticatedRequest } from './session.js';

/** Usuario de la sesión, establecido por `SessionGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
