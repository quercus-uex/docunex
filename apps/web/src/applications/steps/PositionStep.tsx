import {
  type ApplicationDto,
  defaultExpone,
  defaultSolicita,
  updateApplicationSchema,
} from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Anchor, Button, Group, Select, SimpleGrid, Stack, Text, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { applyServerErrors } from '../../api/validation';
import { usePositions } from '../../positions/api';
import { useUpdateApplication } from '../api';

/** En este paso se editan todos los campos a la vez. */
const schema = updateApplicationSchema.required();

/** ① Plaza, fecha de la solicitud y textos de RedSara. */
export function PositionStep({
  application,
  locked,
  onNext,
}: {
  application: ApplicationDto;
  locked: boolean;
  onNext: () => void;
}) {
  const { data: positions = [] } = usePositions();
  const update = useUpdateApplication(application.id);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      positionId: application.position.id,
      applicationDate: application.applicationDate,
      expone: application.expone,
      solicita: application.solicita,
    },
  });
  const positionId = useWatch({ control, name: 'positionId' });
  const position = positions.find((p) => p.id === positionId) ?? application.position;

  const submit = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: (saved) => {
        reset({
          positionId: saved.position.id,
          applicationDate: saved.applicationDate,
          expone: saved.expone,
          solicita: saved.solicita,
        });
        onNext();
      },
      onError: (error) => {
        if (!applyServerErrors(error, setError)) {
          notifications.show({ color: 'red', title: 'No se pudo guardar', message: error.message });
        }
      },
    }),
  );

  const restore = (field: 'expone' | 'solicita') =>
    !locked && (
      <Anchor
        component="button"
        type="button"
        size="sm"
        style={{ alignSelf: 'flex-start' }}
        onClick={() =>
          setValue(
            field,
            field === 'expone' ? defaultExpone(position) : defaultSolicita(position),
            {
              shouldDirty: true,
            },
          )
        }
      >
        Restablecer el texto propuesto
      </Anchor>
    );

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Controller
            control={control}
            name="positionId"
            render={({ field }) => (
              <Select
                label="Plaza"
                description={
                  <>
                    El código y la fecha de resolución se editan en{' '}
                    <Anchor component={Link} to="/plazas" inherit>
                      Plazas
                    </Anchor>
                    .
                  </>
                }
                data={positions.map((p) => ({
                  value: p.id,
                  label: p.title ? `${p.code} · ${p.title}` : p.code,
                }))}
                value={field.value}
                onChange={(value) => value && field.onChange(value)}
                error={errors.positionId?.message}
                allowDeselect={false}
                readOnly={locked}
              />
            )}
          />
          <Controller
            control={control}
            name="applicationDate"
            render={({ field }) => (
              <DateInput
                label="Fecha de la solicitud"
                description="La del Anexo III y la portada del CV"
                valueFormat="DD/MM/YYYY"
                clearable={!locked}
                readOnly={locked}
                value={field.value}
                onChange={field.onChange}
                error={errors.applicationDate?.message}
              />
            )}
          />
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          Textos para los campos "Expone" y "Solicita" del formulario de RedSara. El asunto será el
          código de la plaza.
        </Text>
        <Stack gap={4}>
          <Textarea
            label="Expone"
            autosize
            minRows={3}
            readOnly={locked}
            error={errors.expone?.message}
            {...register('expone')}
          />
          {restore('expone')}
        </Stack>
        <Stack gap={4}>
          <Textarea
            label="Solicita"
            autosize
            minRows={2}
            readOnly={locked}
            error={errors.solicita?.message}
            {...register('solicita')}
          />
          {restore('solicita')}
        </Stack>
        <Group justify="flex-end">
          {isDirty && !locked ? (
            <Button type="submit" loading={update.isPending}>
              Guardar y seguir
            </Button>
          ) : (
            <Button onClick={onNext}>Siguiente</Button>
          )}
        </Group>
      </Stack>
    </form>
  );
}
