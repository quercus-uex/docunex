import {
  DOCUMENT_KIND_LABELS,
  type DocumentDto,
  MAX_DEGREE_VERIFICATIONS,
  missingProfileFields,
  type ProfileDto,
  type ProfileInput,
  profileInputSchema,
} from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Center,
  FileButton,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconEye, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { lazy, type ReactNode, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { applyServerErrors } from '../api/validation';
import { documentFileUrl, useDocuments, useUploadDocuments } from '../documents/api';
import { notifyUploadResults } from '../documents/uploadNotifications';
import { HiringDataForm } from '../hiring/HiringDataForm';
import { PreviewDrawer } from '../previews/PreviewDrawer';
import { useProfile, useUpdateProfile } from './api';

const AnnexPreview = lazy(() => import('../previews/AnnexPreview'));

export function ProfilePage() {
  const { data: profile, isPending, error } = useProfile();

  if (isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  if (error) {
    return (
      <Alert color="red" title="No se pudo cargar el perfil">
        {error.message}
      </Alert>
    );
  }
  return (
    <Stack maw={880}>
      <ProfileForm profile={profile} />
      <Section
        title="Datos para la contratación (segunda fase)"
        description="Solo hacen falta si resultas seleccionado/a: IBAN de la cuenta para la nómina, número de la Seguridad Social y los demás datos del contrato. Se guardan aparte del resto del perfil."
      >
        <HiringDataForm />
      </Section>
    </Stack>
  );
}

/** Valores del formulario: cadenas vacías en lugar de `null` para los campos de texto. */
function toFormValues(profile: ProfileDto): ProfileInput {
  return {
    lastNames: profile.lastNames ?? '',
    firstName: profile.firstName ?? '',
    dni: profile.dni ?? '',
    birthDate: profile.birthDate,
    address: profile.address ?? '',
    postalCode: profile.postalCode ?? '',
    city: profile.city ?? '',
    province: profile.province ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    degree: profile.degree ?? '',
    idDocumentId: profile.idDocumentId,
    degreeVerifications: profile.degreeVerifications.map(({ degreeName, code }) => ({
      degreeName,
      code,
    })),
  };
}

function ProfileForm({ profile }: { profile: ProfileDto }) {
  const update = useUpdateProfile();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileInputSchema),
    defaultValues: toFormValues(profile),
  });
  const verifications = useFieldArray({ control, name: 'degreeVerifications' });
  const missing = missingProfileFields(profile);
  // Valores del formulario al abrir la vista previa (aunque no estén guardados).
  const [preview, setPreview] = useState<ProfileInput | null>(null);

  const submit = handleSubmit((input) =>
    update.mutate(input, {
      onSuccess: (saved) => {
        reset(toFormValues(saved));
        notifications.show({ color: 'green', message: 'Perfil guardado' });
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
      <Stack maw={880}>
        <Group justify="space-between" align="flex-end">
          <Title order={2}>Perfil</Title>
          <Group>
            <Button
              variant="default"
              leftSection={<IconEye size={16} />}
              onClick={() => setPreview(getValues())}
            >
              Vista previa del Anexo III
            </Button>
            <Button type="submit" loading={update.isPending} disabled={!isDirty}>
              Guardar
            </Button>
          </Group>
        </Group>
        <Text c="dimmed">
          Estos datos rellenan el Anexo III (modelo de solicitud) y la portada del currículum.
          Puedes guardarlos a medias.
        </Text>
        {missing.length > 0 && (
          <Alert color="yellow" variant="light" title="Perfil incompleto">
            Para generar una solicitud falta: {missing.join(', ')}.
          </Alert>
        )}

        <Section title="Datos personales">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Apellidos"
              error={errors.lastNames?.message}
              {...register('lastNames')}
            />
            <TextInput
              label="Nombre"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <TextInput label="DNI/NIE" error={errors.dni?.message} {...register('dni')} />
            <Controller
              control={control}
              name="birthDate"
              render={({ field }) => (
                <DateInput
                  label="Fecha de nacimiento"
                  valueFormat="DD/MM/YYYY"
                  clearable
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.birthDate?.message}
                />
              )}
            />
            <TextInput
              label="Correo electrónico"
              type="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextInput
              label="Teléfono"
              type="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </SimpleGrid>
        </Section>

        <Section title="Domicilio">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Domicilio" error={errors.address?.message} {...register('address')} />
            <TextInput
              label="Código postal"
              inputMode="numeric"
              error={errors.postalCode?.message}
              {...register('postalCode')}
            />
            <TextInput label="Localidad" error={errors.city?.message} {...register('city')} />
            <TextInput
              label="Provincia"
              error={errors.province?.message}
              {...register('province')}
            />
          </SimpleGrid>
        </Section>

        <Section title="Titulación">
          <TextInput
            label="Titulación"
            description="Tal como quieres que aparezca en el Anexo III."
            error={errors.degree?.message}
            {...register('degree')}
          />
        </Section>

        <Section title="Copia del DNI">
          <Controller
            control={control}
            name="idDocumentId"
            render={({ field }) => (
              <IdDocumentField
                value={field.value}
                onChange={(id) => setValue('idDocumentId', id, { shouldDirty: true })}
                error={errors.idDocumentId?.message}
              />
            )}
          />
        </Section>

        <Section
          title="Verificación de títulos"
          description="Código o URL de verificación de cada título universitario oficial. Se imprimirán como códigos QR en la portada del currículum; si los incluyes, no hace falta adjuntar la copia compulsada del título."
        >
          <Stack gap="sm">
            {verifications.fields.map((item, index) => (
              <Group key={item.id} align="flex-start" wrap="nowrap">
                <TextInput
                  label={index === 0 ? 'Titulación' : undefined}
                  aria-label="Titulación"
                  style={{ flex: 1 }}
                  error={errors.degreeVerifications?.[index]?.degreeName?.message}
                  {...register(`degreeVerifications.${index}.degreeName`)}
                />
                <TextInput
                  label={index === 0 ? 'Código o URL de verificación' : undefined}
                  aria-label="Código o URL de verificación"
                  style={{ flex: 1 }}
                  error={errors.degreeVerifications?.[index]?.code?.message}
                  {...register(`degreeVerifications.${index}.code`)}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  mt={index === 0 ? 28 : 4}
                  aria-label="Quitar titulación"
                  onClick={() => verifications.remove(index)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            ))}
            <Group>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                disabled={verifications.fields.length >= MAX_DEGREE_VERIFICATIONS}
                onClick={() => verifications.append({ degreeName: '', code: '' })}
              >
                Añadir titulación
              </Button>
            </Group>
          </Stack>
        </Section>
      </Stack>
      <PreviewDrawer
        opened={preview !== null}
        onClose={() => setPreview(null)}
        title="Vista previa del Anexo III"
      >
        {preview && <AnnexPreview values={preview} />}
      </PreviewDrawer>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <div>
          <Title order={4}>{title}</Title>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </div>
        {children}
      </Stack>
    </Paper>
  );
}

/** Selector de la copia del DNI entre los documentos subidos, con opción de subir una nueva. */
function IdDocumentField({
  value,
  onChange,
  error,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  error?: string;
}) {
  const { data: documents = [] } = useDocuments();
  const upload = useUploadDocuments();

  // Primero los documentos de identidad; después el resto.
  const options = [...documents]
    .sort((a, b) => Number(b.kind === 'identity') - Number(a.kind === 'identity'))
    .map((document: DocumentDto) => ({
      value: document.id,
      label: `${document.name} (${DOCUMENT_KIND_LABELS[document.kind]})`,
    }));

  const uploadFile = (file: File | null) => {
    if (!file) return;
    upload.mutate(
      { files: [file], kind: 'identity' },
      {
        onSuccess: (results) => {
          notifyUploadResults(results);
          const [result] = results;
          if (result && result.status !== 'rejected') onChange(result.document.id);
        },
      },
    );
  };

  return (
    <Stack gap="xs">
      <Group align="flex-end">
        <Select
          label="Documento"
          placeholder="Elige la copia del DNI o pasaporte"
          data={options}
          value={value}
          onChange={onChange}
          searchable
          clearable
          nothingFoundMessage="No hay documentos"
          error={error}
          style={{ flex: 1 }}
        />
        <FileButton
          onChange={uploadFile}
          accept="application/pdf,image/jpeg,image/png,image/tiff,image/webp"
        >
          {(props) => (
            <Button
              {...props}
              variant="default"
              leftSection={<IconUpload size={16} />}
              loading={upload.isPending}
            >
              Subir copia
            </Button>
          )}
        </FileButton>
      </Group>
      {value && (
        <Anchor href={documentFileUrl(value)} target="_blank" size="sm">
          Ver el documento seleccionado
        </Anchor>
      )}
    </Stack>
  );
}
