import { type Baremo, formatPoints } from '@docunex/shared';
import { Anchor, Badge, Group, List, Modal, Stack, Table, Text, Title } from '@mantine/core';

/** El baremo completo que se aplica: apartados, ponderaciones, criterios y fuente. */
export function BaremoModal({
  baremo,
  opened,
  onClose,
}: {
  baremo: Baremo;
  opened: boolean;
  onClose: () => void;
}) {
  const direct = baremo.sections
    .flatMap((section) => section.items)
    .filter((item) => item.profileIndependent)
    .map((item) => item.id);
  const directItems =
    direct.length === 1
      ? `el subapartado ${direct[0]}`
      : `los subapartados ${direct.slice(0, -1).join(', ')} y ${direct.at(-1)}`;
  return (
    <Modal opened={opened} onClose={onClose} title={baremo.name} size="xl">
      <Stack gap="md">
        <Text size="sm">
          {baremo.source.title}.{' '}
          <Anchor href={baremo.source.url} target="_blank" rel="noreferrer">
            {baremo.source.reference}
          </Anchor>
        </Text>
        <List size="sm" spacing={4}>
          {baremo.source.notes.map((note) => (
            <List.Item key={note.text}>
              {note.url ? (
                <Anchor href={note.url} target="_blank" rel="noreferrer" size="sm">
                  {note.text}
                </Anchor>
              ) : (
                note.text
              )}
            </List.Item>
          ))}
        </List>

        {baremo.sections.map((section) => (
          <Stack key={section.id} gap={4}>
            <Group gap="xs">
              <Title order={5}>
                {section.id}. {section.title}
              </Title>
              <Badge variant="outline" color="gray" style={{ textTransform: 'none' }}>
                Ponderación × {formatPoints(section.weight)}
              </Badge>
            </Group>
            <Table verticalSpacing={4} fz="sm">
              <Table.Tbody>
                {section.items.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td w={220} valign="top">
                      <Text size="sm" fw={500}>
                        {item.label} {item.title}
                      </Text>
                      <Badge
                        size="md"
                        variant="light"
                        color={item.profileIndependent ? 'teal' : 'blue'}
                      >
                        {item.profileIndependent ? 'Directo' : 'Comisión'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {item.criteria}
                      {item.caps && item.caps.length > 0 && (
                        <Text size="xs" c="dimmed">
                          {item.caps.map((cap) => cap.label).join(' · ')}
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        ))}

        <Stack gap={4}>
          <Title order={5}>Qué decide la comisión</Title>
          <Text size="sm">
            Solo {directItems} se valoran sin tener en cuenta la relación con la plaza: son los que
            suman al mínimo garantizado. El resto cuenta en el máximo con su puntuación completa y
            depende de:
          </Text>
          <List size="sm" spacing={2}>
            {Object.entries(baremo.factorLabels).map(([factor, label]) => (
              <List.Item key={factor}>{label}</List.Item>
            ))}
          </List>
          <Text size="sm" c="dimmed">
            Los periodos (becas, proyectos, contratos, actividad profesional) se cuentan hasta el
            fin del plazo de la plaza, o hasta hoy si no se conoce.
          </Text>
        </Stack>
      </Stack>
    </Modal>
  );
}
