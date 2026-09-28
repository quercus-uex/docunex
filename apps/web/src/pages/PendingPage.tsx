import { Alert, Stack, Title } from '@mantine/core';

/** Sección aún no implementada; indica en qué hito del plan llega. */
export function PendingPage({ title, milestone }: { title: string; milestone: string }) {
  return (
    <Stack maw={720}>
      <Title order={2}>{title}</Title>
      <Alert variant="light">Esta sección llegará en el hito {milestone} del plan.</Alert>
    </Stack>
  );
}
