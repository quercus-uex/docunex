import { type BaremoSectionScore, formatPoints, type ScoreSummary } from '@docunex/shared';
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  Progress,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconInfoCircle, IconScale } from '@tabler/icons-react';
import { type ReactNode, useState } from 'react';
import { BaremoModal } from './BaremoModal';
import { formatRange } from './format';

/**
 * Puntuación estimada de unos méritos: el intervalo total ponderado [fija, máxima] y el desglose
 * por apartados del baremo, con la fuente.
 */
export function ScoreSummaryCard({
  summary,
  description,
  defaultExpanded = false,
}: {
  summary: ScoreSummary;
  description: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showBaremo, setShowBaremo] = useState(false);
  const { total, baremo } = summary;
  const pending = total.max - total.min;
  const directTitles = baremo.sections
    .flatMap((section) => section.items)
    .filter((item) => item.profileIndependent)
    .map((item) => item.title.toLowerCase())
    .join(', ');

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Group gap="xs">
              <IconScale size={18} />
              <Text fw={600}>Puntuación estimada · plaza {baremo.positionKind}</Text>
            </Group>
            <Text size="xs" c="dimmed" maw={560}>
              {description}
            </Text>
          </Stack>
          <Stack gap={0} align="flex-end">
            <Text fz={28} fw={700} lh={1.1} data-testid="score-total">
              {formatRange(total)}
            </Text>
            <Text size="xs" c="dimmed">
              puntos ponderados (mínimo garantizado – máximo posible)
            </Text>
          </Stack>
        </Group>

        <Progress.Root
          size="lg"
          aria-label="Puntuación fija frente a la que depende de la comisión"
        >
          {total.max > 0 && (
            <>
              <Progress.Section value={(total.min / total.max) * 100} color="teal" />
              <Progress.Section value={(pending / total.max) * 100} color="blue.3" />
            </>
          )}
        </Progress.Root>
        <Group gap="lg">
          <Legend color="teal" label={`Fija: ${formatPoints(total.min)}`}>
            Méritos que suman sin depender de la comisión: {directTitles}.
          </Legend>
          <Legend
            color="blue.3"
            label={`A criterio de la comisión: hasta ${formatPoints(pending)} más`}
          >
            El resto depende de la relación con el área y el perfil de la plaza (la mitad si es
            afín), de los tramos e índices que fije la comisión o del nº de autores.
          </Legend>
        </Group>

        <Group justify="space-between">
          <Button
            variant="subtle"
            onClick={() => setExpanded((value) => !value)}
            rightSection={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          >
            {expanded ? 'Ocultar el desglose' : 'Desglose por apartados'}
          </Button>
          <Button variant="subtle" onClick={() => setShowBaremo(true)}>
            Ver el baremo
          </Button>
        </Group>

        <Collapse expanded={expanded}>
          <Stack gap="md">
            {summary.sections.map((section) => (
              <SectionBreakdown
                key={section.section.id}
                score={section}
                positionKind={baremo.positionKind}
              />
            ))}
            {summary.unscored.length > 0 && (
              <Alert color="orange" variant="light" py="xs">
                {summary.unscored.length === 1
                  ? '1 mérito no se ha podido puntuar'
                  : `${summary.unscored.length} méritos no se han podido puntuar`}
                : {[...new Set(summary.unscored.map((u) => u.reason))].join(' ')}
              </Alert>
            )}
          </Stack>
        </Collapse>

        <Text size="xs" c="dimmed">
          Fuente:{' '}
          <Anchor href={baremo.source.url} target="_blank" rel="noreferrer" size="xs">
            {baremo.source.title}
          </Anchor>{' '}
          ({baremo.source.reference.split(':')[0]}). Es una estimación: la puntuación la fija la
          comisión.
        </Text>
      </Stack>
      <BaremoModal baremo={baremo} opened={showBaremo} onClose={() => setShowBaremo(false)} />
    </Paper>
  );
}

function Legend({ color, label, children }: { color: string; label: string; children: ReactNode }) {
  return (
    <Tooltip label={children} multiline maw={320} withArrow>
      <Group gap={6} style={{ cursor: 'help' }}>
        <Box w={10} h={10} bg={color} style={{ borderRadius: 2 }} />
        <Text size="sm">{label}</Text>
        <IconInfoCircle size={14} opacity={0.6} />
      </Group>
    </Tooltip>
  );
}

function SectionBreakdown({
  score,
  positionKind,
}: {
  score: BaremoSectionScore;
  positionKind: string;
}) {
  const items = score.items.filter((item) => item.merits.length > 0);
  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap="xs">
          <Title order={6}>
            {score.section.id}. {score.section.title}
          </Title>
          <Tooltip label={`Ponderación del apartado para plazas ${positionKind}`} withArrow>
            <Badge variant="outline" color="gray" style={{ textTransform: 'none' }}>
              × {formatPoints(score.section.weight)}
            </Badge>
          </Tooltip>
        </Group>
        <Text size="sm">
          {formatRange(score.raw)} sin ponderar ·{' '}
          <Text span fw={600}>
            {formatRange(score.weighted)} ponderados
          </Text>
        </Text>
      </Group>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">
          Sin méritos en este apartado.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={480}>
          <Table verticalSpacing={4} fz="sm" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Subapartado</Table.Th>
                <Table.Th ta="right">Méritos</Table.Th>
                <Table.Th ta="right">Fija</Table.Th>
                <Table.Th ta="right">Máxima</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map(({ item, score: range, capped, merits }) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Tooltip label={item.criteria} multiline maw={380} withArrow>
                      <span style={{ cursor: 'help' }}>
                        {item.label} {item.title}
                      </span>
                    </Tooltip>
                    {item.profileIndependent && (
                      <Badge ml={6} size="md" color="teal" variant="light">
                        Directo
                      </Badge>
                    )}
                    {capped && (
                      <Tooltip
                        label={item.caps?.map((cap) => cap.label).join(' · ') ?? 'Solo una entrada'}
                        withArrow
                      >
                        <Badge ml={6} size="md" color="yellow" variant="light">
                          Tope
                        </Badge>
                      </Tooltip>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">{merits.length}</Table.Td>
                  <Table.Td ta="right">{formatPoints(range.min)}</Table.Td>
                  <Table.Td ta="right">{formatPoints(range.max)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
