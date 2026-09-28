import { QueryFailedError } from 'typeorm';

/** Violación de una restricción UNIQUE en PostgreSQL. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
