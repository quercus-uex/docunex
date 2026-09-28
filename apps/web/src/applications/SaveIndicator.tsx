import { Loader, Text } from '@mantine/core';
import type { SaveState } from './useAutoSave';

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'error') {
    return (
      <Text size="sm" c="red">
        No se pudo guardar
      </Text>
    );
  }
  if (state === 'saved') {
    return (
      <Text size="sm" c="dimmed">
        Guardado
      </Text>
    );
  }
  return <Loader size="xs" />;
}
