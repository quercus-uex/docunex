import type { PackageDto, PackageSummaryDto } from '@docunex/shared';
import type { Package } from './package.entity.js';

export function toPackageSummary(pkg: Package): PackageSummaryDto {
  return {
    id: pkg.id,
    applicationId: pkg.applicationId,
    version: pkg.version,
    status: pkg.status,
    progress: pkg.progress,
    size: pkg.size,
    pageCount: pkg.pageCount,
    errors: pkg.errors,
    warnings: pkg.warnings,
    createdAt: pkg.createdAt.toISOString(),
    finishedAt: pkg.finishedAt?.toISOString() ?? null,
  };
}

/** `pkg.documents` debe venir cargado y ordenado por código. */
export function toPackageDto(pkg: Package): PackageDto {
  return {
    ...toPackageSummary(pkg),
    layout: pkg.layout,
    documents: (pkg.documents ?? []).map((document) => ({
      code: document.code,
      block: document.block,
      documentId: document.documentId,
      name: document.name,
      detail: document.detail,
      startPage: document.startPage,
      pageCount: document.pageCount,
      size: document.size,
      originalSize: document.originalSize,
    })),
  };
}
