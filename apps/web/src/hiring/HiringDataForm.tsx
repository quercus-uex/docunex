import {
  formatIban,
  formatNuss,
  type HiringDataDto,
  type HiringDataInput,
  hiringDataInputSchema,
} from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Center, Group, Loader, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { applyServerErrors } from '../api/validation';
import { useHiringData, useUpdateHiringData } from './api';

/** Valores del formulario: cadenas vacías en lugar de `null`; IBAN y NUSS en su formato legible. */
function toFormValues(data: HiringDataDto): HiringDataInput {
  return {
    iban: data.iban ? formatIban(data.iban) : '',
    socialSecurityNumber: data.socialSecurityNumber ? formatNuss(data.socialSecurityNumber) : '',
    nationality: data.nationality ?? '',
    birthPlace: data.birthPlace ?? '',
  };
}

/**
 * Datos para formalizar el contrato (segunda fase). Se guardan en el perfil, así que sirven para todas
 * las solicitudes.
 */
export function HiringDataForm({ readOnly = false }: { readOnly?: boolean }) {
  const { data, isPending, error } = useHiringData();
  if (isPending) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }
  if (error) {
    return (
      <Alert color="red" title="No se pudieron cargar los datos">
        {error.message}
      </Alert>
    );
  }
  return <Form data={data} readOnly={readOnly} />;
}

function Form({ data, readOnly }: { data: HiringDataDto; readOnly: boolean }) {
  const update = useUpdateHiringData();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(hiringDataInputSchema),
    defaultValues: toFormValues(data),
    // El IBAN y el NUSS se comprueban al salir del campo, sin esperar a guardar.
    mode: 'onTouched',
  });

  const submit = handleSubmit((input) =>
    update.mutate(input, {
      onSuccess: (saved) => {
        reset(toFormValues(saved));
        notifications.show({ color: 'green', message: 'Datos para el contrato guardados' });
      },
      onError: (error) => {
        if (!applyServerErrors(error, setError)) {
          notifications.show({ color: 'red', title: 'No se pudo guardar', message: error.message });
        }
      },
    }),
  );

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="IBAN de la cuenta bancaria"
            description="Cuenta en la que cobrarás la nómina; debes ser titular."
            placeholder="ES00 0000 0000 0000 0000 0000"
            autoComplete="off"
            readOnly={readOnly}
            error={errors.iban?.message}
            {...register('iban')}
          />
          <TextInput
            label="Nº de afiliación a la Seguridad Social"
            description="12 dígitos (NUSS): provincia, número y dígitos de control."
            placeholder="28/12345678/40"
            inputMode="numeric"
            autoComplete="off"
            readOnly={readOnly}
            error={errors.socialSecurityNumber?.message}
            {...register('socialSecurityNumber')}
          />
          <TextInput
            label="Nacionalidad"
            readOnly={readOnly}
            error={errors.nationality?.message}
            {...register('nationality')}
          />
          <TextInput
            label="Lugar de nacimiento"
            description="Localidad y provincia, o país."
            readOnly={readOnly}
            error={errors.birthPlace?.message}
            {...register('birthPlace')}
          />
        </SimpleGrid>
        {!readOnly && (
          <Group justify="flex-end">
            <Button type="submit" loading={update.isPending} disabled={!isDirty}>
              Guardar datos
            </Button>
          </Group>
        )}
      </Stack>
    </form>
  );
}
