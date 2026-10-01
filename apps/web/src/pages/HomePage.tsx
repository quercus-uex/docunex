import { Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconArrowRight,
  IconAward,
  IconFiles,
  IconSend,
  IconSignature,
  IconUser,
  type TablerIcon,
} from '@tabler/icons-react';
import { Link } from 'react-router';

interface HomeStep {
  to: string;
  title: string;
  description: string;
  action: string;
  icon: TablerIcon;
}

const STEPS: HomeStep[] = [
  {
    to: '/perfil',
    title: 'Completa tu perfil',
    description: 'Tus datos personales rellenan el Anexo III. Sube también la copia del DNI.',
    action: 'Ir al perfil',
    icon: IconUser,
  },
  {
    to: '/documentos',
    title: 'Sube tus documentos',
    description: 'Títulos, certificados, contratos… Se convierten a PDF y se reutilizan siempre.',
    action: 'Ir a documentos',
    icon: IconFiles,
  },
  {
    to: '/meritos',
    title: 'Registra tus méritos',
    description: 'Cada mérito, una sola vez, vinculado con sus justificantes.',
    action: 'Ir a méritos',
    icon: IconAward,
  },
  {
    to: '/solicitudes',
    title: 'Crea una solicitud',
    description: 'Elige la plaza y genera el PDF del expediente, listo para firmar y registrar.',
    action: 'Ir a solicitudes',
    icon: IconSend,
  },
];

export function HomePage() {
  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <Title order={2}>Inicio</Title>
        <Text size="lg" maw={960}>
          DocUNEx prepara el expediente de solicitud de plazas PCI de la Universidad de Extremadura
          a partir de tus datos, méritos y documentos acreditativos.
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="lg" component="ol" p={0} m={0}>
        {STEPS.map(({ to, title, description, action, icon: Icon }, index) => (
          <Paper
            key={to}
            component="li"
            withBorder
            p="xl"
            style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}
          >
            <Group gap="md" wrap="nowrap" mb="md">
              <ThemeIcon size={48} radius="md" variant="light" aria-hidden>
                <Icon size={28} stroke={1.75} />
              </ThemeIcon>
              <Text c="dimmed" fw={700} size="sm" tt="uppercase">
                Paso {index + 1}
              </Text>
            </Group>
            <Title order={3} fz="h4" mb="xs">
              {title}
            </Title>
            <Text c="dimmed" mb="lg" style={{ flex: 1 }}>
              {description}
            </Text>
            <Button
              component={Link}
              to={to}
              variant="light"
              rightSection={<IconArrowRight size={18} />}
              style={{ alignSelf: 'flex-start' }}
            >
              {action}
            </Button>
          </Paper>
        ))}
      </SimpleGrid>
      <Paper withBorder p="xl">
        <Group gap="md" wrap="nowrap" align="flex-start">
          <ThemeIcon size={48} radius="md" variant="light" color="teal" aria-hidden>
            <IconSignature size={28} stroke={1.75} />
          </ThemeIcon>
          <div>
            <Title order={3} fz="h4" mb="xs">
              Si te seleccionan: segunda fase
            </Title>
            <Text c="dimmed">
              Prepara en la misma solicitud los datos para el contrato (cuenta bancaria, Seguridad
              Social…) y los documentos para formalizarlo.
            </Text>
          </div>
        </Group>
      </Paper>
    </Stack>
  );
}
