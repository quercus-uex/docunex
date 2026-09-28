import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './client';

interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * Traslada al formulario los errores de validación que devuelve la API (400 con `issues`).
 * Devuelve `true` si ha asignado alguno.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || error.status !== 400) return false;
  const issues = (error.body as { issues?: ValidationIssue[] } | null)?.issues ?? [];
  for (const issue of issues) {
    setError(issue.path as Path<T>, { message: issue.message });
  }
  return issues.length > 0;
}
