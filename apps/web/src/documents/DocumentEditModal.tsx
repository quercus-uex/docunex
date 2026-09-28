import {
  DOCUMENT_KIND_LABELS,
  DOCUMENT_KINDS,
  type DocumentDto,
  updateDocumentSchema,
} from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { Controller, useForm } from 'react-hook-form';
import { applyServerErrors } from '../api/validation';
import { useUpdateDocument } from './api';

const formSchema = updateDocumentSchema.required();

const KIND_OPTIONS = DOCUMENT_KINDS.map((kind) => ({
  value: kind,
  label: DOCUMENT_KIND_LABELS[kind],
}));

export function DocumentEditModal({
  document,
  onClose,
}: {
  document: DocumentDto | null;
  onClose: () => void;
}) {
  return (
    <Modal opened={document !== null} onClose={onClose} title="Editar documento">
      {document && <EditForm key={document.id} document={document} onClose={onClose} />}
    </Modal>
  );
}

function EditForm({ document, onClose }: { document: DocumentDto; onClose: () => void }) {
  const update = useUpdateDocument();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: document.name, kind: document.kind, issuedAt: document.issuedAt },
  });

  const submit = handleSubmit((input) =>
    update.mutate(
      { id: document.id, input },
      {
        onSuccess: () => {
          notifications.show({ color: 'green', message: 'Documento actualizado' });
          onClose();
        },
        onError: (error) => {
          if (!applyServerErrors(error, setError)) {
            notifications.show({
              color: 'red',
              title: 'No se pudo guardar',
              message: error.message,
            });
          }
        },
      },
    ),
  );

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <TextInput
          label="Nombre"
          description="Es el nombre que aparecerá en la hoja índice del expediente."
          error={errors.name?.message}
          {...register('name')}
        />
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <Select
              label="Tipo"
              data={KIND_OPTIONS}
              allowDeselect={false}
              value={field.value}
              onChange={(value) => value && field.onChange(value)}
              error={errors.kind?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="issuedAt"
          render={({ field }) => (
            <DateInput
              label="Fecha de emisión"
              placeholder="Opcional"
              valueFormat="DD/MM/YYYY"
              clearable
              value={field.value}
              onChange={field.onChange}
              error={errors.issuedAt?.message}
            />
          )}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={update.isPending}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
