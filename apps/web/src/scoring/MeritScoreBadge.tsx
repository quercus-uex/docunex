import { type Baremo, formatPoints, type MeritScore } from '@docunex/shared';
import { Badge, List, Stack, Text, Tooltip } from '@mantine/core';

/** Puntos de un mérito junto a él: fijos (verde), a criterio de la comisión (azul) o nada. */
export function MeritScoreBadge({
  score,
  baremo,
  unscoredReason,
  size,
}: {
  score: MeritScore | undefined;
  baremo: Baremo;
  unscoredReason?: string | undefined;
  /** Por defecto, el del tema. */
  size?: 'sm' | 'md';
}) {
  if (!score) {
    if (!unscoredReason) return null;
    return (
      <Tooltip label={unscoredReason} multiline maw={320} withArrow>
        <Badge color="orange" variant="light" size={size}>
          Sin puntuar
        </Badge>
      </Tooltip>
    );
  }

  const superseded = score.supersededBy !== null;
  const label = superseded
    ? 'No suma'
    : score.points === 0
      ? '0 pts'
      : score.direct
        ? `${formatPoints(score.points)} pts`
        : `0 – ${formatPoints(score.points)} pts`;
  const color = superseded || score.points === 0 ? 'gray' : score.direct ? 'teal' : 'blue';

  return (
    <Tooltip
      multiline
      maw={380}
      withArrow
      label={
        <Stack gap={4}>
          <Text size="xs" fw={600}>
            {score.basis}
          </Text>
          {superseded ? (
            <Text size="xs">
              Ya cuenta otro mérito del mismo grupo con más puntos (mismo idioma, congreso, revista
              o apartado de una sola entrada).
            </Text>
          ) : score.direct ? (
            <Text size="xs">Suma directamente: no depende de la comisión.</Text>
          ) : (
            <>
              <Text size="xs">Depende de la comisión:</Text>
              <List size="xs" spacing={2}>
                {score.factors.map((factor) => (
                  <List.Item key={factor}>{baremo.factorLabels[factor]}</List.Item>
                ))}
              </List>
            </>
          )}
          {score.notes.map((note) => (
            <Text key={note} size="xs" c="yellow.2">
              {note}
            </Text>
          ))}
        </Stack>
      }
    >
      <Badge color={color} variant="light" size={size} style={{ textTransform: 'none' }}>
        {label}
      </Badge>
    </Tooltip>
  );
}
