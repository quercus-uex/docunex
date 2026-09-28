import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@docunex/shared';
import { Badge } from '@mantine/core';

const COLORS: Record<ApplicationStatus, string> = {
  draft: 'gray',
  generated: 'blue',
  registered: 'green',
  closed: 'dark',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge color={COLORS[status]} variant="light">
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
