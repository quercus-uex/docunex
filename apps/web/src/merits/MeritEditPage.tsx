import {
  type AnyMeritTypeDef,
  cvSectionHeading,
  emptyFormValues,
  getMeritType,
  isMeritType,
  type MeritDto,
  type MeritInputData,
  nullableText,
  toFormValues,
} from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { applyServerErrors } from '../api/validation';
import { useMerit, useSaveMerit } from './api';
import { DeleteMeritModal } from './DeleteMeritModal';
import { MeritDocumentsField } from './MeritDocumentsField';
import { MeritFields } from './MeritFields';

/** `/meritos/nuevo?tipo=…` y `/meritos/:id`. */
export function MeritEditPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data: merit, isPending, error } = useMerit(id);

  if (id === undefined) {
    const type = params.get('tipo') ?? '';
    if (!isMeritType(type)) {
      return (
        <Problem title="Tipo de mérito desconocido">Vuelve a la lista y elige un tipo.</Problem>
      );
    }
    return <MeritEditor def={getMeritType(type)} merit={null} />;
  }
  if (isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  if (error) return <Problem title="No se pudo cargar el mérito">{error.message}</Problem>;
  return <MeritEditor key={merit.id} def={getMeritType(merit.type)} merit={merit} />;
}

function Problem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack>
      <BackLink />
      <Alert color="red" title={title}>
        {children}
      </Alert>
    </Stack>
  );
}

function BackLink() {
  return (
    <Anchor component={Link} to="/meritos" size="sm">
      <Group gap={4}>
        <IconArrowLeft size={18} />
        Méritos
      </Group>
    </Anchor>
  );
}

interface FormValues {
  data: Record<string, unknown>;
  notes: string;
  documentIds: string[];
}

type FormOutput = Omit<MeritInputData, 'type'>;

function MeritEditor({ def, merit }: { def: AnyMeritTypeDef; merit: MeritDto | null }) {
  const navigate = useNavigate();
  const save = useSaveMerit();
  const [deleting, setDeleting] = useState(false);

  const resolver = useMemo(
    () =>
      zodResolver(
        z.object({
          data: def.schema,
          notes: nullableText(2000),
          documentIds: z.array(z.string()),
        }),
      ) as unknown as Resolver<FormValues, unknown, FormOutput>,
    [def],
  );
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver,
    defaultValues: {
      data: merit ? toFormValues(def.fieldDefs, merit.data) : emptyFormValues(def.fieldDefs),
      notes: merit?.notes ?? '',
      documentIds: merit?.documents.map((document) => document.id) ?? [],
    },
  });
  const {
    control,
    handleSubmit,
    register,
    setError,
    formState: { errors, isDirty },
  } = form;

  const submit = handleSubmit((values) =>
    save.mutate(
      { id: merit?.id, input: { type: def.type, ...values } },
      {
        onSuccess: () => {
          notifications.show({ color: 'green', message: 'Mérito guardado' });
          void navigate('/meritos');
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
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate>
        <Stack>
          <BackLink />
          <Group justify="space-between" align="flex-end">
            <div>
              <Title order={2}>{def.label}</Title>
              <SectionHint def={def} />
            </div>
            <Group>
              {merit && (
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => setDeleting(true)}
                >
                  Eliminar
                </Button>
              )}
              <Button type="submit" loading={save.isPending} disabled={merit !== null && !isDirty}>
                Guardar
              </Button>
            </Group>
          </Group>
          {def.description && <Text c="dimmed">{def.description}</Text>}

          {Object.keys(def.fieldDefs).length > 0 && (
            <Paper withBorder p="md">
              <MeritFields defs={def.fieldDefs} prefix="data" />
            </Paper>
          )}

          <Paper withBorder p="md">
            <Stack gap="sm">
              <div>
                <Title order={4}>Justificantes</Title>
                <Text size="sm" c="dimmed">
                  En el expediente irán en este orden, cada uno con su número DOC_nn.
                </Text>
              </div>
              <Controller
                control={control}
                name="documentIds"
                render={({ field }) => (
                  <MeritDocumentsField
                    value={field.value}
                    onChange={field.onChange}
                    uploadKind={def.documentKind}
                    error={errors.documentIds?.message}
                  />
                )}
              />
            </Stack>
          </Paper>

          <Paper withBorder p="md">
            <Textarea
              label="Notas"
              description="Solo para ti; no se imprimen en el currículum."
              autosize
              minRows={2}
              maxRows={8}
              error={errors.notes?.message}
              {...register('notes')}
            />
          </Paper>
        </Stack>
      </form>
      {merit && (
        <DeleteMeritModal
          merit={deleting ? merit : null}
          onClose={() => setDeleting(false)}
          onDeleted={() => void navigate('/meritos')}
        />
      )}
    </FormProvider>
  );
}

/**
 * Apartado del CV en el que caerá el mérito con los datos actuales. Se calcula aunque el formulario
 * esté incompleto: `cvSection` solo mira los campos que deciden el apartado (tipo, ámbito…).
 */
function SectionHint({ def }: { def: AnyMeritTypeDef }) {
  const data = useWatch<FormValues, 'data'>({ name: 'data' });
  const section = guessSection(def, data);

  return (
    <Group gap="xs" mt={4}>
      <Text size="sm" c="dimmed">
        Apartado del CV:
      </Text>
      {section ? (
        <Badge variant="light" tt="none">
          {cvSectionHeading(section)}
        </Badge>
      ) : (
        <Text size="sm" c="dimmed">
          {def.sections.join(', ')} según los datos
        </Text>
      )}
    </Group>
  );
}

function guessSection(def: AnyMeritTypeDef, data: Record<string, unknown>) {
  try {
    const section = def.cvSection(data as Parameters<AnyMeritTypeDef['cvSection']>[0]);
    return def.sections.includes(section) ? section : undefined;
  } catch {
    return undefined;
  }
}
