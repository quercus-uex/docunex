import {
  type ApplicationDto,
  REDSARA,
  type RegistryEntryDto,
  registrySubject,
} from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  CopyButton,
  Group,
  List,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconEdit,
  IconExternalLink,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { type ReactNode, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { applyServerErrors } from '../../api/validation';
import { formatMegabytes } from '../../utils/format';
import {
  packageFileUrl,
  useRegisterApplication,
  useSetApplicationStatus,
  useUpdateRegistryEntry,
} from '../api';

/** ⑥ Guía para presentar el expediente en RedSara y anotación del nº de registro. */
export function RegistryStep({
  application,
  onBack,
}: {
  application: ApplicationDto;
  onBack: () => void;
}) {
  const pkg = application.latestPackage;
  const entry = application.registryEntries[0];

  if (!entry && pkg?.status !== 'done') {
    return (
      <Stack>
        <Alert color="yellow" variant="light" title="Todavía no hay expediente que presentar">
          Genera el expediente en el paso anterior. La guía de registro usa la última versión
          generada sin errores.
        </Alert>
        <Group justify="flex-end">
          <Button variant="default" onClick={onBack}>
            Anterior
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack>
      {entry ? (
        <>
          <RegistrationSummary application={application} entry={entry} />
          <Accordion variant="contained">
            <Accordion.Item value="guide">
              <Accordion.Control>Guía de registro</Accordion.Control>
              <Accordion.Panel>
                <Guide application={application} packageId={entry.packageId} />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </>
      ) : (
        <>
          <Guide application={application} packageId={pkg!.id} />
          <Step number={8} title="Anota el número de registro">
            <Text size="sm">
              Cópialo del justificante que da RedSara. La solicitud pasará a{' '}
              <strong>registrada</strong> y ya no se podrá modificar ni volver a generar.
            </Text>
            <RegistryEntryForm application={application} />
          </Step>
        </>
      )}
      <Group justify="flex-end">
        <Button variant="default" onClick={onBack}>
          Anterior
        </Button>
      </Group>
    </Stack>
  );
}

function Guide({ application, packageId }: { application: ApplicationDto; packageId: string }) {
  const pkg = application.latestPackage;
  // El expediente presentado es siempre la última versión: después ya no se puede regenerar.
  const size = pkg?.id === packageId ? pkg.size : null;
  const tooBig = size !== null && size > REDSARA.maxFileBytes;
  return (
    <Stack>
      <Step number={1} title="Descarga el expediente y revísalo">
        <Group>
          <Button
            component="a"
            href={packageFileUrl(packageId)}
            download
            leftSection={<IconDownload size={16} />}
          >
            Descargar el PDF
          </Button>
          {size !== null && (
            <Text size="sm" c={tooBig ? 'red' : 'dimmed'}>
              {formatMegabytes(size)} de {formatMegabytes(REDSARA.maxFileBytes)}
            </Text>
          )}
        </Group>
        {tooBig && (
          <Alert color="red" variant="light">
            Pasa del límite de RedSara por fichero. Quita méritos o sustituye los documentos más
            pesados y vuelve a generarlo antes de presentarlo.
          </Alert>
        )}
      </Step>
      <Step number={2} title="Fírmalo con AutoFirma">
        <Text size="sm">
          Abre el PDF con AutoFirma y fírmalo con tu DNIe o tu certificado electrónico. Adjunta en
          RedSara el fichero firmado, no el original. La firma añade unos KB: el expediente se
          genera con un margen por debajo de 10 MB para que quepa.
        </Text>
      </Step>
      <Step number={3} title="Entra en el registro electrónico">
        <Group gap="xs">
          <Button
            component="a"
            href={REDSARA.url}
            target="_blank"
            rel="noreferrer"
            variant="default"
            rightSection={<IconExternalLink size={16} />}
          >
            rec.redsara.es
          </Button>
          <Text size="sm" c="dimmed">
            Identifícate con el DNIe o el certificado y empieza un registro nuevo.
          </Text>
        </Group>
      </Step>
      <Step number={4} title="Elige el organismo destinatario">
        <Text size="sm">Abre el buscador de organismos y selecciona:</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <CopyField label="Nivel de administración" value={REDSARA.administrationLevel} />
          <CopyField label="Comunidad autónoma" value={REDSARA.region} />
          <CopyField label="Buscar" value={REDSARA.organism} />
          <CopyField label="Código del organismo (para comprobarlo)" value={REDSARA.organismCode} />
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          Pulsa «Filtrar» y selecciona «{REDSARA.organism}».
        </Text>
      </Step>
      <Step number={5} title="Rellena asunto, expone y solicita">
        <CopyField
          label="Asunto (código de la plaza)"
          value={registrySubject(application.position)}
        />
        <CopyField label="Expone" value={application.expone} multiline />
        <CopyField label="Solicita" value={application.solicita} multiline />
      </Step>
      <Step number={6} title="Adjunta el PDF firmado">
        <List size="sm" spacing={2}>
          <List.Item>Un único fichero: el expediente completo firmado.</List.Item>
          <List.Item>
            Límites de RedSara: {formatMegabytes(REDSARA.maxFileBytes)} por fichero,{' '}
            {formatMegabytes(REDSARA.maxTotalBytes)} en total y {REDSARA.maxFiles} ficheros como
            mucho.
          </List.Item>
        </List>
      </Step>
      <Step number={7} title="Firma el envío y guarda el justificante">
        <Text size="sm">
          RedSara vuelve a pedir AutoFirma para firmar el registro. Descarga el justificante: en él
          está el número de registro, la fecha y la hora.
        </Text>
      </Step>
    </Stack>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <Group align="flex-start" wrap="nowrap" gap="sm">
      <ThemeIcon radius="xl" variant="light" size="md">
        <Text size="sm" fw={700}>
          {number}
        </Text>
      </ThemeIcon>
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Title order={5} mt={2}>
          {title}
        </Title>
        {children}
      </Stack>
    </Group>
  );
}

function CopyField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <Paper withBorder px="sm" py={6}>
      <Group wrap="nowrap" align={multiline ? 'flex-start' : 'center'} gap="xs">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
          <Text size="sm" fw={500} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {value}
          </Text>
        </div>
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copiado' : 'Copiar'} withArrow>
              <ActionIcon
                variant="subtle"
                color={copied ? 'teal' : 'gray'}
                onClick={copy}
                aria-label={`Copiar ${label}`}
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </Paper>
  );
}

function RegistrationSummary({
  application,
  entry,
}: {
  application: ApplicationDto;
  entry: RegistryEntryDto;
}) {
  const [editing, setEditing] = useState(false);
  const setStatus = useSetApplicationStatus(application.id);
  const closed = application.status === 'closed';
  const change = (status: 'registered' | 'closed') =>
    setStatus.mutate(status, {
      onError: (error) =>
        notifications.show({ color: 'red', title: 'No se pudo cambiar', message: error.message }),
    });

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" c="dimmed">
              Número de registro
            </Text>
            <Text fw={700} size="lg" style={{ overflowWrap: 'anywhere' }}>
              {entry.number}
            </Text>
            <Text size="sm" c="dimmed">
              {dayjs(entry.registeredAt).format('DD/MM/YYYY [a las] HH:mm')} · expediente versión{' '}
              {entry.packageVersion}
            </Text>
          </div>
          <Group gap="xs">
            <Button
              variant="default"
              size="sm"
              leftSection={<IconEdit size={16} />}
              onClick={() => setEditing(true)}
            >
              Corregir
            </Button>
            {closed ? (
              <Button
                variant="default"
                size="sm"
                leftSection={<IconLockOpen size={16} />}
                loading={setStatus.isPending}
                onClick={() => change('registered')}
              >
                Reabrir
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                leftSection={<IconLock size={16} />}
                loading={setStatus.isPending}
                onClick={() => change('closed')}
              >
                Cerrar solicitud
              </Button>
            )}
          </Group>
        </Group>
        {entry.notes && (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {entry.notes}
          </Text>
        )}
        <Group gap="xs">
          <Anchor href={packageFileUrl(entry.packageId)} target="_blank" size="sm">
            Ver el expediente presentado
          </Anchor>
          {closed && (
            <Badge variant="light" color="gray">
              Cerrada: el proceso ha terminado
            </Badge>
          )}
        </Group>
      </Stack>
      <Modal opened={editing} onClose={() => setEditing(false)} title="Corregir el asiento">
        <RegistryEntryForm
          application={application}
          entry={entry}
          onDone={() => setEditing(false)}
        />
      </Modal>
    </Paper>
  );
}

/** Fecha y hora locales tal como las usa `DateTimePicker`. */
const PICKER_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const formSchema = z.object({
  number: z.string().trim().min(1, 'Obligatorio').max(100, 'Máximo 100 caracteres'),
  registeredAt: z.string('Obligatorio').min(1, 'Obligatorio'),
  notes: z.string().max(2000, 'Máximo 2000 caracteres'),
});

function RegistryEntryForm({
  application,
  entry,
  onDone,
}: {
  application: ApplicationDto;
  entry?: RegistryEntryDto;
  onDone?: () => void;
}) {
  const register = useRegisterApplication(application.id);
  const update = useUpdateRegistryEntry(application.id);
  const mutation = entry ? update : register;
  const {
    control,
    register: field,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: entry?.number ?? '',
      registeredAt: dayjs(entry?.registeredAt).format(PICKER_FORMAT),
      notes: entry?.notes ?? '',
    },
  });

  const submit = handleSubmit(({ registeredAt, ...values }) => {
    const input = { ...values, registeredAt: dayjs(registeredAt).toISOString() };
    const callbacks = {
      onSuccess: () => {
        notifications.show({
          color: 'green',
          message: entry ? 'Asiento corregido' : 'Solicitud registrada',
        });
        onDone?.();
      },
      onError: (error: Error) => {
        if (!applyServerErrors(error, setError)) {
          notifications.show({ color: 'red', title: 'No se pudo guardar', message: error.message });
        }
      },
    };
    if (entry) update.mutate({ entryId: entry.id, ...input }, callbacks);
    else register.mutate(input, callbacks);
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Número de registro"
            placeholder="REGAGE…"
            withAsterisk
            error={errors.number?.message}
            {...field('number')}
          />
          <Controller
            control={control}
            name="registeredAt"
            render={({ field: { value, onChange } }) => (
              <DateTimePicker
                label="Fecha y hora del registro"
                withAsterisk
                valueFormat="DD/MM/YYYY HH:mm"
                value={value}
                onChange={(next) => onChange(next ?? '')}
                error={errors.registeredAt?.message}
              />
            )}
          />
        </SimpleGrid>
        <Textarea
          label="Notas"
          description="Por ejemplo, dónde has guardado el justificante"
          autosize
          minRows={2}
          error={errors.notes?.message}
          {...field('notes')}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={mutation.isPending}>
            {entry ? 'Guardar' : 'Marcar como registrada'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
