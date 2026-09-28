import { describe, expect, it } from 'vitest';
import { missingProfileFields, profileInputSchema, type ProfileInput } from './profile.js';

const empty: ProfileInput = {
  lastNames: null,
  firstName: null,
  dni: null,
  birthDate: null,
  address: null,
  postalCode: null,
  city: null,
  province: null,
  email: null,
  phone: null,
  degree: null,
  idDocumentId: null,
  degreeVerifications: [],
};

describe('profileInputSchema', () => {
  it('acepta un perfil vacío y convierte las cadenas vacías en null', () => {
    const result = profileInputSchema.parse({ ...empty, lastNames: '   ', dni: '' });
    expect(result.lastNames).toBeNull();
    expect(result.dni).toBeNull();
  });

  it('normaliza el DNI y el correo', () => {
    const result = profileInputSchema.parse({
      ...empty,
      dni: '12345678-z',
      email: ' Ana@Example.com ',
    });
    expect(result.dni).toBe('12345678Z');
    expect(result.email).toBe('ana@example.com');
  });

  it('rechaza formatos no válidos', () => {
    const result = profileInputSchema.safeParse({
      ...empty,
      dni: '12345678A',
      postalCode: '6000',
      birthDate: '31/12/1990',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      'birthDate',
      'dni',
      'postalCode',
    ]);
  });
});

describe('missingProfileFields', () => {
  it('lista los campos obligatorios vacíos', () => {
    const profile = profileInputSchema.parse({ ...empty, firstName: 'Ana', dni: '12345678Z' });
    const missing = missingProfileFields(profile);
    expect(missing).toContain('Apellidos');
    expect(missing).toContain('Copia del DNI');
    expect(missing).not.toContain('Nombre');
    expect(missing).not.toContain('DNI/NIE');
  });
});
