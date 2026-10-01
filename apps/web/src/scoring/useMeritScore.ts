import {
  getBaremo,
  type MeritDto,
  type PositionKind,
  type ScoreSummary,
  scoreMerits,
} from '@docunex/shared';
import { useMemo } from 'react';
import { useProfile } from '../profile/api';

/** Hoy en ISO (fecha local). */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Puntuación de unos méritos con el baremo del tipo de plaza (de momento, solo PCI). Los periodos
 * se cuentan hasta `referenceDate` (hoy si no se indica).
 */
export function useMeritScore(
  merits: readonly MeritDto[] | undefined,
  options: { referenceDate?: string | null; positionKind?: PositionKind } = {},
): ScoreSummary | null {
  const { data: profile } = useProfile();
  const applicantName =
    [profile?.firstName, profile?.lastNames].filter(Boolean).join(' ').trim() || null;
  const referenceDate = options.referenceDate || todayIso();
  const positionKind = options.positionKind;

  return useMemo(
    () =>
      merits
        ? scoreMerits(getBaremo(positionKind), merits, { referenceDate, applicantName })
        : null,
    [merits, referenceDate, applicantName, positionKind],
  );
}
