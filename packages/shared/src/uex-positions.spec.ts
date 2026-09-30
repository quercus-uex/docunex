import { describe, expect, it } from 'vitest';
import {
  departmentKey,
  parseApplicationDeadline,
  positionStage,
  sameDepartment,
  uexImportSchema,
} from './uex-positions.js';

describe('positionStage', () => {
  it('es la fase más avanzada con documento publicado', () => {
    expect(positionStage({ call: 'c.pdf', firstMinutes: null, secondMinutes: null })).toBe('call');
    expect(positionStage({ call: 'c.pdf', firstMinutes: 'a1.pdf', secondMinutes: null })).toBe(
      'firstMinutes',
    );
    expect(positionStage({ call: 'c.pdf', firstMinutes: 'a1.pdf', secondMinutes: 'a2.pdf' })).toBe(
      'secondMinutes',
    );
  });

  it('sin documentos, la plaza está en convocatoria', () => {
    expect(positionStage({ call: null, firstMinutes: null, secondMinutes: null })).toBe('call');
  });
});

describe('parseApplicationDeadline', () => {
  it('lee el fin del plazo de solicitudes', () => {
    expect(
      parseApplicationDeadline(
        'Fin de plazo de presentación de solicitudes: 01 de octubre de 2026',
      ),
    ).toBe('2026-10-01');
    expect(
      parseApplicationDeadline(
        'FIN DE PLAZO DE PRESENTACION DE SOLICITUDES 9 de Septiembre de 2026',
      ),
    ).toBe('2026-09-09');
  });

  it('ignora otros plazos y los textos sin fecha', () => {
    expect(
      parseApplicationDeadline(
        'Fin de plazo de presentación de reclamaciones: 28 de septiembre de 2026',
      ),
    ).toBeNull();
    expect(parseApplicationDeadline('RESUELTA')).toBeNull();
    expect(parseApplicationDeadline(null)).toBeNull();
  });
});

describe('departmentKey', () => {
  it('iguala variantes de un mismo departamento', () => {
    const key = departmentKey('Ingeniería de Sistemas Informáticos y Telemáticos');
    expect(departmentKey('Dpto. de Ingenierías de Sistemas Informáticos y Telemáticos')).toBe(key);
    expect(
      departmentKey('  departamento de ingenieria de sistemas informaticos y telematicos'),
    ).toBe(key);
  });

  it('distingue departamentos distintos', () => {
    expect(sameDepartment('Física', 'Física Aplicada')).toBe(false);
    expect(sameDepartment('Física', null)).toBe(false);
    expect(sameDepartment('Física', 'FISICA')).toBe(true);
  });
});

describe('uexImportSchema', () => {
  it('normaliza los códigos y exige al menos uno', () => {
    expect(uexImportSchema.parse({ codes: [' in000913 '] })).toEqual({ codes: ['IN000913'] });
    expect(uexImportSchema.safeParse({ codes: [] }).success).toBe(false);
  });
});
