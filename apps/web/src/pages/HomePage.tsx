import { Anchor, List, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function HomePage() {
  return (
    <Stack maw={720}>
      <Title order={2}>Inicio</Title>
      <Text>
        DocUNEx prepara el expediente de solicitud de plazas PCI de la Universidad de Extremadura a
        partir de tus datos, méritos y documentos acreditativos.
      </Text>
      <List type="ordered" spacing="xs">
        <List.Item>
          Completa tu{' '}
          <Anchor component={Link} to="/perfil">
            perfil
          </Anchor>{' '}
          y sube la copia del DNI.
        </List.Item>
        <List.Item>
          Sube tus{' '}
          <Anchor component={Link} to="/documentos">
            documentos
          </Anchor>{' '}
          acreditativos.
        </List.Item>
        <List.Item>
          Registra tus{' '}
          <Anchor component={Link} to="/meritos">
            méritos
          </Anchor>{' '}
          y vincúlalos con sus justificantes.
        </List.Item>
        <List.Item>
          Crea una{' '}
          <Anchor component={Link} to="/solicitudes">
            solicitud
          </Anchor>{' '}
          para una plaza y genera el PDF listo para firmar y registrar.
        </List.Item>
        <List.Item>
          Si te seleccionan, prepara en la misma solicitud la segunda fase: los datos para el
          contrato (cuenta bancaria, Seguridad Social…) y los documentos para formalizarlo.
        </List.Item>
      </List>
    </Stack>
  );
}
