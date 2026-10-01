import {
  type ApplicationDto,
  type DocumentDto,
  evaluateHiring,
  HIRING_DOCUMENTS,
  HIRING_ITEM_STATUS_LABELS,
  type HiringDocumentKey,
  type HiringDto,
  type HiringItemStatus,
  isApplicationLocked,
} from '@docunex/shared';
import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  List,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleDashed,
  IconClock,
  IconFileDownload,
} from '@tabler/icons-react';
import { type ReactNode, useState } from 'react';
import { useDocuments } from '../../documents/api';
import { hiringFileUrl, useHiring, useHiringData, useSetHiringDocuments } from '../../hiring/api';
import { HiringDataForm } from '../../hiring/HiringDataForm';
import { MeritDocumentsField } from '../../merits/MeritDocumentsField';
import { useProfile } from '../../profile/api';
import { SaveIndicator } from '../SaveIndicator';
import { useAutoSave } from '../useAutoSave';

type HiringDocument = (typeof HIRING_DOCUMENTS)[number];

/**
 * ⑦ Segunda fase: si la candidatura resulta seleccionada, datos y documentos para formalizar el
 * contrato. Se abre cuando la solicitud está registrada.
 */
export function HiringStep({
  application,
  onBack,
}: {
  application: ApplicationDto;
  onBack: () => void;
}) {
  const { data: hiring, isPending, error } = useHiring(application.id);
  const back = (
    <Group justify="flex-end">
      <Button variant="default" onClick={onBack}>
        Anterior
      </Button>
    </Group>
  );

  if (!isApplicationLocked(application.status)) {
    return (
      <Stack>
        <Alert color="gray" variant="light" title="Disponible cuando registres la solicitud">
          Si resultas seleccionado/a, la Universidad te pedirá los datos y la documentación para
          formalizar el contrato. Aquí podrás prepararlos en cuanto anotes el número de registro de
          esta solicitud. Documentos previstos:
          <List size="sm" mt="xs">
            {HIRING_DOCUMENTS.map((item) => (
              <List.Item key={item.key}>
                {item.label}
                {!item.required && ' (si procede)'}
              </List.Item>
            ))}
          </List>
        </Alert>
        {back}
      </Stack>
    );
  }
  if (isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  if (error) {
    return (
      <Alert color="red" title="No se pudo cargar la segunda fase">
        {error.message}
      </Alert>
    );
  }
  return (
    <Stack>
      <HiringPanel application={application} hiring={hiring} />
      {back}
    </Stack>
  );
}

function HiringPanel({ application, hiring }: { application: ApplicationDto; hiring: HiringDto }) {
  const readOnly = !hiring.editable;
  const { data: documents = [] } = useDocuments();
  const { data = hiring.data } = useHiringData();
  const { data: profile } = useProfile();
  const [links, setLinks] = useState(
    () =>
      Object.fromEntries(hiring.status.items.map((item) => [item.key, item.documentIds])) as Record<
        HiringDocumentKey,
        string[]
      >,
  );

  // El estado se recalcula aquí con los documentos al día (p. ej. uno recién subido que se procesa).
  const byId = new Map(documents.map((document) => [document.id, document]));
  const status = evaluateHiring({
    data,
    documents: Object.fromEntries(
      Object.entries(links).map(([key, ids]) => [
        key,
        ids.flatMap((id) => {
          const document = byId.get(id);
          return document ? [{ id, status: document.status }] : [];
        }),
      ]),
    ),
  });
  const statusOf = new Map(status.items.map((item) => [item.key, item.status]));
  const processing = Object.values(links)
    .flat()
    .some((id) => byId.get(id)?.status !== 'ready');

  /** Documentos que ya están en la app y valen para una entrada, con un atajo para vincularlos. */
  const suggestion = (item: HiringDocument): { label: string; ids: string[] } | null => {
    if (item.key === 'identity' && profile?.idDocumentId) {
      return { label: 'Usar la copia del DNI del perfil', ids: [profile.idDocumentId] };
    }
    if (item.key === 'degree') {
      const ids = application.requirementDocumentIds.filter(
        (id) => byId.get(id)?.kind === 'degree',
      );
      if (ids.length > 0) return { label: 'Usar el título de los requisitos (bloque 5)', ids };
    }
    return null;
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Si resultas seleccionado/a, la Universidad te pedirá estos datos y documentos para
        formalizar el contrato. La lista es orientativa: compárala con la comunicación que recibas y
        con las bases de la convocatoria. Los documentos se vinculan desde tu biblioteca, como en
        los requisitos y los méritos.
      </Text>
      {readOnly && (
        <Alert color="gray" variant="light">
          La solicitud está cerrada: la segunda fase se puede consultar y descargar, pero no
          modificar. Reábrela en el paso de registro si necesitas cambiar algo.
        </Alert>
      )}

      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start" gap="md">
          <Stack gap={6} style={{ flex: 1, minWidth: 240 }}>
            <Group gap="xs">
              <Title order={4}>Estado de la documentación</Title>
              {status.complete ? (
                <Badge color="green" variant="light">
                  Completa
                </Badge>
              ) : (
                <Badge color="yellow" variant="light">
                  Pendiente
                </Badge>
              )}
            </Group>
            <Progress
              value={(status.requiredDone / status.requiredTotal) * 100}
              color={status.complete ? 'green' : 'blue'}
              aria-label="Documentos obligatorios aportados"
            />
            <Text size="sm">
              {status.requiredDone} de {status.requiredTotal} documentos obligatorios aportados
              {status.missingData.length > 0
                ? ` · Faltan datos: ${status.missingData.join(', ')}`
                : ' · Datos para el contrato completos'}
            </Text>
          </Stack>
          <Stack gap={4} align="flex-end">
            <Button
              component="a"
              href={hiringFileUrl(application.id)}
              target="_blank"
              leftSection={<IconFileDownload size={16} />}
              variant={status.complete ? 'filled' : 'default'}
              disabled={processing}
            >
              Descargar PDF de la fase 2
            </Button>
            <Text size="xs" c="dimmed" ta="right" maw={280}>
              {processing
                ? 'Espera a que terminen de procesarse los documentos.'
                : 'Portada con tus datos y la relación de documentos, seguida de los documentos.'}
            </Text>
          </Stack>
        </Group>
      </Paper>

      <Section
        title="1. Datos para el contrato"
        description="Se guardan en tu perfil y se reutilizan en todas las solicitudes."
      >
        <HiringDataForm readOnly={readOnly} />
      </Section>

      <Section
        title="2. Documentos"
        description="Vincula uno o varios documentos a cada entrada (por ejemplo, el DNI por las dos caras). Se guardan solos."
      >
        <Stack gap="sm">
          {HIRING_DOCUMENTS.map((item, index) => (
            <HiringDocumentItem
              key={item.key}
              applicationId={application.id}
              item={item}
              index={index}
              value={links[item.key] ?? []}
              onChange={(ids) => setLinks((current) => ({ ...current, [item.key]: ids }))}
              status={statusOf.get(item.key) ?? 'missing'}
              suggestion={suggestion(item)}
              documents={byId}
              readOnly={readOnly}
            />
          ))}
        </Stack>
      </Section>
    </Stack>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <div>
          <Title order={4}>{title}</Title>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </div>
        {children}
      </Stack>
    </Paper>
  );
}

const STATUS_BADGE_COLORS: Record<HiringItemStatus, string> = {
  missing: 'orange',
  not_ready: 'blue',
  complete: 'green',
};

function StatusIcon({ status, required }: { status: HiringItemStatus; required: boolean }) {
  if (status === 'complete') {
    return (
      <ThemeIcon color="green" variant="light" radius="xl">
        <IconCircleCheck size={18} />
      </ThemeIcon>
    );
  }
  if (status === 'not_ready') {
    return (
      <ThemeIcon color="blue" variant="light" radius="xl">
        <IconClock size={18} />
      </ThemeIcon>
    );
  }
  return required ? (
    <ThemeIcon color="orange" variant="light" radius="xl">
      <IconAlertCircle size={18} />
    </ThemeIcon>
  ) : (
    <ThemeIcon color="gray" variant="light" radius="xl">
      <IconCircleDashed size={18} />
    </ThemeIcon>
  );
}

function HiringDocumentItem({
  applicationId,
  item,
  index,
  value,
  onChange,
  status,
  suggestion,
  documents,
  readOnly,
}: {
  applicationId: string;
  item: HiringDocument;
  index: number;
  value: string[];
  onChange: (ids: string[]) => void;
  status: HiringItemStatus;
  suggestion: { label: string; ids: string[] } | null;
  documents: Map<string, DocumentDto>;
  readOnly: boolean;
}) {
  const save = useSetHiringDocuments(applicationId, item.key);
  const state = useAutoSave(value, (ids) => save.mutateAsync(ids));
  const required = item.required as boolean;
  const usable = suggestion?.ids.filter((id) => documents.has(id) && !value.includes(id)) ?? [];

  return (
    <Paper withBorder p="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <StatusIcon status={status} required={required} />
            <div>
              <Group gap={6}>
                <Text fw={600} size="sm">
                  {index + 1}. {item.label}
                </Text>
                {!required && (
                  <Badge size="md" variant="outline" color="gray">
                    Si procede
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {item.description}
              </Text>
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {!readOnly && state !== 'saved' && <SaveIndicator state={state} />}
            <Badge color={required || status !== 'missing' ? STATUS_BADGE_COLORS[status] : 'gray'}>
              {HIRING_ITEM_STATUS_LABELS[status]}
            </Badge>
          </Group>
        </Group>
        <MeritDocumentsField
          value={value}
          onChange={onChange}
          uploadKind={item.kinds[0]}
          preferredKinds={item.kinds}
          readOnly={readOnly}
          emptyText="Sin documento vinculado."
        />
        {!readOnly && usable.length > 0 && value.length === 0 && (
          <Group>
            <Button variant="light" onClick={() => onChange([...value, ...usable])}>
              {suggestion!.label}
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
