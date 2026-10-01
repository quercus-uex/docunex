import {
  POSITION_STAGE_LABELS,
  type PositionStage,
  type PositionStageDocuments,
} from '@docunex/shared';
import { Badge } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';

const COLORS: Record<PositionStage, string> = {
  call: 'blue',
  firstMinutes: 'orange',
  secondMinutes: 'green',
};

// En celdas de tabla estrechas la etiqueta se cortaba («CONVOCATO…»).
const NO_TRUNCATE = { root: { flexShrink: 0 }, label: { overflow: 'visible' } } as const;

/** Fase de la plaza en la web de la UEx; enlaza al PDF de esa fase si lo hay. */
export function PositionStageBadge({
  stage,
  documents,
}: {
  stage: PositionStage;
  documents?: PositionStageDocuments;
}) {
  const url = documents?.[stage];
  const label = POSITION_STAGE_LABELS[stage];
  if (!url) {
    return (
      <Badge color={COLORS[stage]} variant="light" styles={NO_TRUNCATE}>
        {label}
      </Badge>
    );
  }
  return (
    <Badge
      component="a"
      href={url}
      target="_blank"
      rel="noreferrer"
      color={COLORS[stage]}
      variant="light"
      styles={NO_TRUNCATE}
      rightSection={<IconExternalLink size={12} />}
      style={{ cursor: 'pointer' }}
      title={`Abrir el PDF: ${label}`}
    >
      {label}
    </Badge>
  );
}
