import { getCvSection, getMeritType, MERIT_TYPES } from '@docunex/shared';
import { Modal, NavLink, SimpleGrid, Stack, Title } from '@mantine/core';
import { useNavigate } from 'react-router';

/** Tipos agrupados por bloque del CV (2, 4 y 5), en el orden del catálogo. */
const GROUPS = (['2', '4', '5'] as const).map((block) => ({
  title: getCvSection(block).title,
  types: MERIT_TYPES.map(getMeritType).filter((def) => def.sections[0]!.split('.')[0] === block),
}));

export function MeritTypePicker({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Modal opened={opened} onClose={onClose} title="¿Qué quieres añadir?" size="xl">
      <Stack gap="lg">
        {GROUPS.map((group) => (
          <Stack key={group.title} gap="xs">
            <Title order={5} tt="uppercase" c="dimmed">
              {group.title}
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              {group.types.map((def) => (
                <NavLink
                  key={def.type}
                  label={def.label}
                  description={def.sections.join(' · ')}
                  fw={500}
                  onClick={() => {
                    onClose();
                    void navigate(`/meritos/nuevo?tipo=${def.type}`);
                  }}
                />
              ))}
            </SimpleGrid>
          </Stack>
        ))}
      </Stack>
    </Modal>
  );
}
