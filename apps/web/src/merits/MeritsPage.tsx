import {
  CV_SECTIONS,
  type CvSectionCode,
  type CvSectionDef,
  cvSectionPath,
  getMeritType,
  type MeritDto,
  type ScoreSummary,
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
import { IconEdit, IconEye, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { lazy, useState } from 'react';
import { Link } from 'react-router';
import { PreviewDrawer } from '../previews/PreviewDrawer';
import { useProfile } from '../profile/api';
import { MeritScoreBadge } from '../scoring/MeritScoreBadge';
import { ScoreSummaryCard } from '../scoring/ScoreSummaryCard';
import { useMeritScore } from '../scoring/useMeritScore';
import { useMerits } from './api';
import { DeleteMeritModal } from './DeleteMeritModal';
import { MeritTypePicker } from './MeritTypePicker';

const CvPreview = lazy(() => import('../previews/CvPreview'));

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
  const [previewing, setPreviewing] = useState(false);
  const { data: profile } = useProfile();
  const score = useMeritScore(merits);

  const query = normalize(search.trim());
  const visible = (merits ?? []).filter(
    (merit) =>
      query === '' ||
      normalize(`${merit.summary} ${getMeritType(merit.type).label}`).includes(query),
  );

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Title order={2}>Méritos</Title>
        <Group>
          <Button
            variant="default"
            leftSection={<IconEye size={16} />}
            disabled={!merits || merits.length === 0}
            onClick={() => setPreviewing(true)}
          >
            Vista previa del CV
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setPicking(true)}>
            Añadir mérito
          </Button>
        </Group>
      </Group>
      <Text c="dimmed">
        Registra cada mérito una sola vez con sus justificantes. Se ordenan según los apartados del
        currículum normalizado; en cada solicitud podrás elegir cuáles incluir.
      </Text>

      {score && merits && merits.length > 0 && (
        <ScoreSummaryCard
          summary={score}
          description="Con todos tus méritos y los periodos contados hasta hoy. En cada solicitud se calcula con los méritos que elijas."
        />
      )}

      {merits && merits.length > 0 && (
        <TextInput
          placeholder="Buscar"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={{ base: '100%', sm: 360 }}
          aria-label="Buscar méritos"
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
        <SectionTree merits={visible} score={score} onDelete={setDeleting} />
      ) : (
        <Text c="dimmed" py="lg">
          {merits && merits.length > 0
            ? 'Ningún mérito coincide con la búsqueda.'
            : 'Todavía no has registrado méritos.'}
        </Text>
      )}

      <MeritTypePicker opened={picking} onClose={() => setPicking(false)} />
      <DeleteMeritModal merit={deleting} onClose={() => setDeleting(null)} />
      <PreviewDrawer
        opened={previewing}
        onClose={() => setPreviewing(false)}
        title="Vista previa del currículum"
      >
        <CvPreview merits={merits ?? []} profile={profile} />
      </PreviewDrawer>
    </Stack>
  );
}

/** Apartados del CV que tienen méritos (o subapartados con méritos), en el orden de la plantilla. */
function SectionTree({
  merits,
  score,
  onDelete,
}: {
  merits: MeritDto[];
  score: ScoreSummary | null;
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
          score={score}
          onDelete={onDelete}
        />
      ))}
    </Stack>
  );
}

function SectionBlock({
  section,
  merits,
  score,
  onDelete,
}: {
  section: CvSectionDef;
  merits: MeritDto[];
  score: ScoreSummary | null;
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
        <MeritCard key={merit.id} merit={merit} score={score} onDelete={() => onDelete(merit)} />
      ))}
    </Stack>
  );
}

function MeritCard({
  merit,
  score,
  onDelete,
}: {
  merit: MeritDto;
  score: ScoreSummary | null;
  onDelete: () => void;
}) {
  const def = getMeritType(merit.type);
  const failed = merit.documents.filter((document) => document.status === 'error').length;
  const processing = merit.documents.some((document) => document.status === 'processing');

  return (
    <Paper withBorder px="lg" py="md">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Anchor
            component={Link}
            to={`/meritos/${merit.id}`}
            fw={600}
            c="inherit"
            underline="hover"
          >
            {merit.summary}
          </Anchor>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {def.label}
            </Text>
            {score && (
              <MeritScoreBadge
                score={score.byMerit.get(merit.id)}
                baremo={score.baremo}
                unscoredReason={score.unscored.find((u) => u.meritId === merit.id)?.reason}
              />
            )}
            {merit.documents.length === 0 ? (
              <Badge color="red" variant="light">
                Sin justificante
              </Badge>
            ) : (
              <Tooltip
                label={merit.documents.map((document) => document.name).join(' · ')}
                multiline
                maw={360}
                withArrow
              >
                <Badge color="gray" variant="light">
                  {merit.documents.length}{' '}
                  {merit.documents.length === 1 ? 'justificante' : 'justificantes'}
                </Badge>
              </Tooltip>
            )}
            {failed > 0 && (
              <Badge color="red" variant="light">
                {failed === 1 ? 'Justificante con error' : `${failed} justificantes con error`}
              </Badge>
            )}
            {processing && (
              <Badge color="blue" variant="light">
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
            aria-label={`Editar ${merit.summary}`}
          >
            <IconEdit size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`Eliminar ${merit.summary}`}
            onClick={onDelete}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}
