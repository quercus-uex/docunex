import { describe, expect, it } from 'vitest';
import { SnakeNamingStrategy, snakeCase } from './snake-naming.strategy.js';

describe('snakeCase', () => {
  it.each([
    ['passwordHash', 'password_hash'],
    ['createdAt', 'created_at'],
    ['pdfSha256', 'pdf_sha256'],
    ['DOCCode', 'doc_code'],
    ['email', 'email'],
  ])('%s → %s', (input, expected) => {
    expect(snakeCase(input)).toBe(expected);
  });
});

describe('SnakeNamingStrategy', () => {
  const strategy = new SnakeNamingStrategy();

  it('respeta los nombres explícitos de columna', () => {
    expect(strategy.columnName('passwordHash', 'pwd', [])).toBe('pwd');
  });

  it('antepone los prefijos de columnas embebidas', () => {
    expect(strategy.columnName('postalCode', undefined, ['homeAddress'])).toBe(
      'home_address_postal_code',
    );
  });

  it('nombra las columnas de clave foránea', () => {
    expect(strategy.joinColumnName('idDocument', 'id')).toBe('id_document_id');
  });
});
