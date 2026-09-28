// Crea el usuario de la aplicación o, si ya existe, le cambia la contraseña.
// Uso: pnpm user:create [--email correo] [--password contraseña]
import { emailSchema, passwordSchema } from '@docunex/shared';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { UsersService } from '../users/users.service.js';
import { CliModule } from './cli.module.js';
import { prompt, promptHidden } from './prompt.js';

async function readPassword(given: string | undefined): Promise<string> {
  if (given !== undefined) return passwordSchema.parse(given);
  const password = passwordSchema.parse(await promptHidden('Contraseña: '));
  if ((await promptHidden('Repite la contraseña: ')) !== password) {
    throw new Error('Las contraseñas no coinciden');
  }
  return password;
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, password: { type: 'string' } },
  });
  const email = emailSchema.parse(values.email ?? (await prompt('Correo electrónico: ')));
  const password = await readPassword(values.password);

  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error', 'warn'] });
  try {
    const { created } = await app.get(UsersService).upsertWithPassword(email, password);
    console.log(created ? `Usuario ${email} creado.` : `Contraseña de ${email} actualizada.`);
  } finally {
    await app.close();
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof z.ZodError ? z.prettifyError(error) : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
