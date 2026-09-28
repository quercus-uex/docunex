import {
  CV_SECTIONS,
  type CvSectionCode,
  type CvSectionDef,
  cvSectionPath,
  getMeritType,
  type MeritDto,
} from '@docunex/shared';
import {
  ActionIcon,
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
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useMerits } from './api';
import { DeleteMeritModal } from './DeleteMeritModal';
import { MeritTypePicker } from './MeritTypePicker';

/** Minúsculas y sin tildes, para buscar. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function MeritsPage() {
  const { data: merits, isPending, error } = useMerits();
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState<MeritDto | null>(null);

  const query = normalize(search.trim());
  const visible = (merits ?? []).filter(
    (merit) =>
      query === '' ||
      normalize(`${merit.summary} ${getMeritType(merit.type).label}`).includes(query),
  );

  return (
    <Stack maw={960}>
      <Group justify="space-between" align="flex-end">
        <Title order={2}>Méritos</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setPicking(true)}>
          Añadir mérito
        </Button>
      </Group>
      <Text c="dimmed">
        Registra cada mérito una sola vez con sus justificantes. Se ordenan según los apartados del
        currículum normalizado; en cada solicitud podrás elegir cuáles incluir.
      </Text>

      {merits && merits.length > 0 && (
        <TextInput
          placeholder="Buscar"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={260}
        />
      )}

      {error && (
        <Alert color="red" title="No se pudieron cargar los méritos">
          {error.message}
        </Alert>
      )}
      {isPending ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : visible.length > 0 ? (
        <SectionTree merits={visible} onDelete={setDeleting} />
      ) : (
        <Text c="dimmed" py="lg">
          {merits && merits.length > 0
            ? 'Ningún mérito coincide con la búsqueda.'
            : 'Todavía no has registrado méritos.'}
        </Text>
      )}

      <MeritTypePicker opened={picking} onClose={() => setPicking(false)} />
      <DeleteMeritModal merit={deleting} onClose={() => setDeleting(null)} />
    </Stack>
  );
}

/** Apartados del CV que tienen méritos (o subapartados con méritos), en el orden de la plantilla. */
function SectionTree({
  merits,
  onDelete,
}: {
  merits: MeritDto[];
  onDelete: (merit: MeritDto) => void;
}) {
  const bySection = new Map<CvSectionCode, MeritDto[]>();
  const withContent = new Set<CvSectionCode>();
  for (const merit of merits) {
    bySection.set(merit.cvSection, [...(bySection.get(merit.cvSection) ?? []), merit]);
    for (const section of cvSectionPath(merit.cvSection)) withContent.add(section.code);
  }

  return (
    <Stack gap="md">
      {CV_SECTIONS.filter((section) => withContent.has(section.code)).map((section) => (
        <SectionBlock
          key={section.code}
          section={section}
          merits={bySection.get(section.code) ?? []}
          onDelete={onDelete}
        />
      ))}
    </Stack>
  );
}

function SectionBlock({
  section,
  merits,
  onDelete,
}: {
  section: CvSectionDef;
  merits: MeritDto[];
  onDelete: (merit: MeritDto) => void;
}) {
  const depth = cvSectionPath(section.code).length - 1;
  return (
    <Stack gap="xs" pl={depth * 16}>
      <Title order={depth === 0 ? 3 : depth === 1 ? 4 : 5} mt={depth === 0 ? 'md' : 0}>
        {section.label} {section.title}
      </Title>
      {section.single && merits.length > 1 && (
        <Alert color="yellow" variant="light" py="xs">
          La plantilla prevé una sola entrada en este apartado. En cada solicitud podrás elegir cuál
          incluir.
        </Alert>
      )}
      {merits.map((merit) => (
        <MeritCard key={merit.id} merit={merit} onDelete={() => onDelete(merit)} />
      ))}
    </Stack>
  );
}

function MeritCard({ merit, onDelete }: { merit: MeritDto; onDelete: () => void }) {
  const def = getMeritType(merit.type);
  const failed = merit.documents.filter((document) => document.status === 'error').length;
  const processing = merit.documents.some((document) => document.status === 'processing');

  return (
    <Paper withBorder px="md" py="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Anchor component={Link} to={`/meritos/${merit.id}`} fw={500} c="inherit">
            {merit.summary}
          </Anchor>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {def.label}
            </Text>
            {merit.documents.length === 0 ? (
              <Badge color="red" variant="light" size="sm">
                Sin justificante
              </Badge>
            ) : (
              <Tooltip
                label={merit.documents.map((document) => document.name).join(' · ')}
                multiline
                maw={360}
                withArrow
              >
                <Badge color="gray" variant="light" size="sm">
                  {merit.documents.length}{' '}
                  {merit.documents.length === 1 ? 'justificante' : 'justificantes'}
                </Badge>
              </Tooltip>
            )}
            {failed > 0 && (
              <Badge color="red" variant="light" size="sm">
                {failed === 1 ? 'Justificante con error' : `${failed} justificantes con error`}
              </Badge>
            )}
            {processing && (
              <Badge color="blue" variant="light" size="sm">
                Procesando
              </Badge>
            )}
          </Group>
          {merit.notes && (
            <Text size="xs" c="dimmed" fs="italic" lineClamp={2}>
              {merit.notes}
            </Text>
          )}
        </Stack>
        <Group gap={2} wrap="nowrap">
          <ActionIcon
            component={Link}
            to={`/meritos/${merit.id}`}
            variant="subtle"
            color="gray"
            aria-label="Editar"
          >
            <IconEdit size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" aria-label="Eliminar" onClick={onDelete}>
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}
