import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema } from './auth.js';

describe('loginSchema', () => {
  it('normaliza el correo a minúsculas y sin espacios', () => {
    const result = loginSchema.parse({ email: '  Ana@Example.COM ', password: 'x' });
    expect(result.email).toBe('ana@example.com');
  });

  it('rechaza correos no válidos', () => {
    const result = loginSchema.safeParse({ email: 'no-es-un-correo', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('exige contraseña', () => {
    const result = loginSchema.safeParse({ email: 'ana@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('exige una longitud mínima', () => {
    expect(passwordSchema.safeParse('corta').success).toBe(false);
    expect(passwordSchema.safeParse('suficientemente-larga').success).toBe(true);
  });
});
