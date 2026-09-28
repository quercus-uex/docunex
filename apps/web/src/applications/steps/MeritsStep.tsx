import {
  type ApplicationDto,
  CV_LEAF_SECTIONS,
  cvSectionHeading,
  getMeritType,
  type MeritDto,
} from '@docunex/shared';
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useMerits } from '../../merits/api';
import { useSetApplicationMerits } from '../api';
import { SaveIndicator } from '../SaveIndicator';
import { useAutoSave } from '../useAutoSave';

/** ③ Méritos que se incluyen y su orden dentro de cada apartado del CV. */
export function MeritsStep({
  application,
  onBack,
  onNext,
}: {
  application: ApplicationDto;
  onBack: () => void;
  onNext: () => void;
}) {
  const { data: merits, isPending } = useMerits();
  const [selected, setSelected] = useState(application.meritIds);
  const save = useSetApplicationMerits(application.id);
  const state = useAutoSave(selected, (ids) => save.mutateAsync(ids));

  if (isPending || !merits) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  const byId = new Map(merits.map((merit) => [merit.id, merit]));
  // Si se borró un mérito seleccionado, deja de estarlo.
  const current = selected.filter((id) => byId.has(id));
  const sections = CV_LEAF_SECTIONS.map((section) => {
    const chosen = current.map((id) => byId.get(id)!).filter((m) => m.cvSection === section.code);
    const others = merits.filter((m) => m.cvSection === section.code && !current.includes(m.id));
    return { section, chosen, others };
  }).filter(({ chosen, others }) => chosen.length + others.length > 0);

  const toggle = (merit: MeritDto, checked: boolean) =>
    setSelected(checked ? [...current, merit.id] : current.filter((id) => id !== merit.id));

  /** Intercambia el mérito con el anterior o el siguiente seleccionado de su apartado. */
  const move = (chosen: MeritDto[], index: number, offset: -1 | 1) => {
    const a = current.indexOf(chosen[index]!.id);
    const b = current.indexOf(chosen[index + offset]!.id);
    const next = [...current];
    [next[a], next[b]] = [next[b]!, next[a]!];
    setSelected(next);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {current.length} de {merits.length} méritos seleccionados. En el CV van por apartados;
          dentro de cada uno, en el orden de esta lista.
        </Text>
        <Group gap="xs">
          <Button variant="subtle" size="xs" onClick={() => setSelected(merits.map((m) => m.id))}>
            Todos
          </Button>
          <Button variant="subtle" size="xs" onClick={() => setSelected([])}>
            Ninguno
          </Button>
        </Group>
      </Group>

      {sections.length === 0 && (
        <Text c="dimmed">
          No tienes méritos.{' '}
          <Anchor component={Link} to="/meritos">
            Añádelos en Méritos
          </Anchor>
          .
        </Text>
      )}
      {sections.map(({ section, chosen, others }) => (
        <Stack key={section.code} gap={6}>
          <Group gap="xs">
            <Title order={5}>{cvSectionHeading(section.code)}</Title>
            {section.single && chosen.length > 1 && (
              <Badge color="yellow" variant="light" size="sm">
                La plantilla prevé una sola entrada
              </Badge>
            )}
          </Group>
          {[...chosen, ...others].map((merit, index) => {
            const isChosen = index < chosen.length;
            return (
              <Paper key={merit.id} withBorder px="sm" py={6} opacity={isChosen ? 1 : 0.6}>
                <Group wrap="nowrap" gap="sm">
                  <Checkbox
                    checked={isChosen}
                    onChange={(event) => toggle(merit, event.currentTarget.checked)}
                    aria-label={`Incluir ${merit.summary}`}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {merit.summary}
                    </Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {getMeritType(merit.type).label}
                      </Text>
                      {merit.documents.length === 0 && (
                        <Badge color="red" variant="light" size="xs">
                          Sin justificante
                        </Badge>
                      )}
                    </Group>
                  </div>
                  {isChosen && (
                    <Group gap={2} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Subir"
                        disabled={index === 0}
                        onClick={() => move(chosen, index, -1)}
                      >
                        <IconArrowUp size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Bajar"
                        disabled={index === chosen.length - 1}
                        onClick={() => move(chosen, index, 1)}
                      >
                        <IconArrowDown size={16} />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>
              </Paper>
            );
          })}
        </Stack>
      ))}

      <Group justify="space-between">
        <SaveIndicator state={state} />
        <Group>
          <Button variant="default" onClick={onBack}>
            Anterior
          </Button>
          <Button onClick={onNext}>Siguiente</Button>
        </Group>
      </Group>
    </Stack>
  );
}
