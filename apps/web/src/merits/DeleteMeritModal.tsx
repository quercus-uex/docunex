import type { MeritDto } from '@docunex/shared';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDeleteMerit } from './api';

export function DeleteMeritModal({
  merit,
  onClose,
  onDeleted,
}: {
  merit: MeritDto | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const remove = useDeleteMerit();
  return (
    <Modal opened={merit !== null} onClose={onClose} title="Eliminar mérito">
      <Stack>
        <Text>
          ¿Seguro que quieres eliminar «{merit?.summary}»? Sus justificantes no se borran: siguen en
          tus documentos.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="red"
            loading={remove.isPending}
            onClick={() =>
              merit &&
              remove.mutate(merit.id, {
                onSuccess: () => {
                  notifications.show({ color: 'green', message: 'Mérito eliminado' });
                  onClose();
                  onDeleted?.();
                },
                onError: (error) =>
                  notifications.show({
                    color: 'red',
                    title: 'No se pudo eliminar',
                    message: error.message,
                  }),
              })
            }
          >
            Eliminar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
