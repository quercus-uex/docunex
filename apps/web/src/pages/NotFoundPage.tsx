import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack maw={720}>
      <Title order={2}>Página no encontrada</Title>
      <Text>
        La dirección no existe.{' '}
        <Anchor component={Link} to="/">
          Volver al inicio
        </Anchor>
        .
      </Text>
    </Stack>
  );
}
