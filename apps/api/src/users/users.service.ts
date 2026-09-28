import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /** Incluye `passwordHash`, que por defecto no se selecciona. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  /** Crea el usuario o, si ya existe, le cambia la contraseña. */
  async upsertWithPassword(
    email: string,
    password: string,
  ): Promise<{ user: User; created: boolean }> {
    const passwordHash = await argon2.hash(password);
    const existing = await this.users.findOneBy({ email });
    if (existing) {
      await this.users.update(existing.id, { passwordHash });
      return { user: existing, created: false };
    }
    const user = await this.users.save(this.users.create({ email, passwordHash }));
    return { user, created: true };
  }
}
