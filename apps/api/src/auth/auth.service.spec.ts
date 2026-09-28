import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { beforeAll, describe, expect, it } from 'vitest';
import type { User } from '../users/user.entity.js';
import type { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const user = { id: 'a3c1e2f0-0000-4000-8000-000000000001', email: 'ana@example.com' } as User;
  let service: AuthService;

  beforeAll(async () => {
    user.passwordHash = await argon2.hash('contraseña-correcta');
    const users = {
      findByEmailWithPassword: async (email: string) => (email === user.email ? user : null),
      findById: async (id: string) => (id === user.id ? user : null),
    } as unknown as UsersService;
    service = new AuthService(users, new JwtService({ secret: 'test-secret' }));
  });

  it('acepta la contraseña correcta', async () => {
    await expect(service.validateCredentials(user.email, 'contraseña-correcta')).resolves.toEqual({
      id: user.id,
      email: user.email,
    });
  });

  it('rechaza una contraseña incorrecta', async () => {
    await expect(service.validateCredentials(user.email, 'otra')).resolves.toBeNull();
  });

  it('rechaza un correo desconocido', async () => {
    await expect(service.validateCredentials('nadie@example.com', 'x')).resolves.toBeNull();
  });

  it('firma y verifica la sesión', async () => {
    const token = await service.signSession({ id: user.id, email: user.email });
    await expect(service.verifySession(token)).resolves.toEqual({ id: user.id, email: user.email });
  });

  it('rechaza tokens manipulados', async () => {
    const token = await service.signSession({ id: user.id, email: user.email });
    await expect(service.verifySession(`${token}x`)).resolves.toBeNull();
  });
});
