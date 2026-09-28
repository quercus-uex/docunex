import type { UploadResult } from '@docunex/shared';
import { notifications } from '@mantine/notifications';
import type { FileRejection } from '@mantine/dropzone';

/** Resume en notificaciones el resultado de una subida por lotes. */
export function notifyUploadResults(results: UploadResult[]): void {
  const created = results.filter((result) => result.status === 'created').length;
  const duplicates = results.filter(
    (result): result is Extract<UploadResult, { status: 'duplicate' }> =>
      result.status === 'duplicate',
  );
  const rejected = results.filter(
    (result): result is Extract<UploadResult, { status: 'rejected' }> =>
      result.status === 'rejected',
  );

  if (created > 0) {
    notifications.show({
      color: 'green',
      title: created === 1 ? 'Documento subido' : `${created} documentos subidos`,
      message: 'Se están procesando; en unos segundos estarán listos.',
    });
  }
  if (duplicates.length > 0) {
    notifications.show({
      color: 'yellow',
      title: 'Ya estaban subidos',
      message: duplicates
        .map((result) => `${result.filename} → «${result.document.name}»`)
        .join('\n'),
    });
  }
  for (const result of rejected) {
    notifications.show({ color: 'red', title: result.filename, message: result.error });
  }
}

export function notifyDropRejections(rejections: FileRejection[]): void {
  for (const { file, errors } of rejections) {
    const message = errors.some((error) => error.code === 'file-too-large')
      ? 'Supera el tamaño máximo de 50 MB.'
      : errors.some((error) => error.code === 'too-many-files')
        ? 'Demasiados ficheros a la vez (máximo 20).'
        : 'Formato no admitido: sube un PDF o una imagen (JPG, PNG, TIFF o WebP).';
    notifications.show({ color: 'red', title: file.name, message });
  }
}
