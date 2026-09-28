import { describe, expect, it } from 'vitest';
import { applicationStatusSchema, registryEntryInputSchema } from './registry.js';

describe('registryEntryInputSchema', () => {
  it('acepta el nº de registro con fecha y hora ISO', () => {
    expect(
      registryEntryInputSchema.parse({
        number: ' REGAGE26e00012345678 ',
        registeredAt: '2026-09-28T10:15:00.000Z',
      }),
    ).toEqual({
      number: 'REGAGE26e00012345678',
      registeredAt: '2026-09-28T10:15:00.000Z',
      notes: null,
    });
  });

  it('rechaza el número vacío y la fecha sin hora', () => {
    const result = registryEntryInputSchema.safeParse({ number: ' ', registeredAt: '2026-09-28' });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['number', 'registeredAt']);
  });
});

describe('applicationStatusSchema', () => {
  it('solo deja pasar a registrada o cerrada', () => {
    expect(applicationStatusSchema.safeParse({ status: 'closed' }).success).toBe(true);
    expect(applicationStatusSchema.safeParse({ status: 'draft' }).success).toBe(false);
  });
});
