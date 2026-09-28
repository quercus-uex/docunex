import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { SessionUser } from '@docunex/shared';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';

interface SessionPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  // Para que un correo inexistente tarde lo mismo que una contraseña incorrecta.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<SessionUser | null> {
    const user = await this.users.findByEmailWithPassword(email);
    if (!user) {
      this.dummyHash ??= argon2.hash('docunex-dummy-password');
      await argon2.verify(await this.dummyHash, password);
      return null;
    }
    const valid = await argon2.verify(user.passwordHash, password);
    return valid ? { id: user.id, email: user.email } : null;
  }

  signSession(user: SessionUser): Promise<string> {
    const payload: SessionPayload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload);
  }

  /** Devuelve el usuario si el token es válido y el usuario sigue existiendo. */
  async verifySession(token: string): Promise<SessionUser | null> {
    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      return null;
    }
    const user = await this.users.findById(payload.sub);
    return user ? { id: user.id, email: user.email } : null;
  }
}
