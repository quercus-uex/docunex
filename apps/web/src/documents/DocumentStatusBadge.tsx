import type { DocumentDto } from '@docunex/shared';
import { Badge, Loader, Tooltip } from '@mantine/core';

export function DocumentStatusBadge({
  document,
}: {
  document: Pick<DocumentDto, 'status' | 'errorMessage'>;
}) {
  if (document.status === 'processing') {
    return (
      <Badge color="blue" variant="light" leftSection={<Loader size={10} color="blue" />}>
        Procesando
      </Badge>
    );
  }
  if (document.status === 'error') {
    return (
      <Tooltip label={document.errorMessage} multiline w={280} withArrow>
        <Badge color="red" variant="light">
          Error
        </Badge>
      </Tooltip>
    );
  }
  return (
    <Badge color="green" variant="light">
      Listo
    </Badge>
  );
}
