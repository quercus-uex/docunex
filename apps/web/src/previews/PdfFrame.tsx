import { pdf } from '@react-pdf/renderer';
import { Alert, Anchor, Center, Group, Loader, Stack } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { type ReactElement, useEffect, useState } from 'react';

type State =
  { status: 'rendering' } | { status: 'ready'; url: string } | { status: 'error'; message: string };

/** Renderiza un documento de `@docunex/templates` y lo muestra en el visor de PDF del navegador. */
export function PdfFrame({ document, fileName }: { document: ReactElement; fileName: string }) {
  const [state, setState] = useState<State>({ status: 'rendering' });

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    // oxlint-disable-next-line typescript/no-explicit-any -- `pdf` exige un <Document>.
    pdf(document as any)
      .toBlob()
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({ status: 'ready', url });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: String(error) });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [document]);

  if (state.status === 'rendering') {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert color="red" title="No se pudo generar la vista previa">
        {state.message}
      </Alert>
    );
  }
  return (
    <Stack h="100%" gap="xs">
      <Group justify="flex-end">
        <Anchor href={state.url} download={fileName} size="sm">
          <Group gap={4}>
            <IconDownload size={14} />
            Descargar
          </Group>
        </Anchor>
      </Group>
      <iframe
        src={state.url}
        title={fileName}
        style={{ flex: 1, width: '100%', border: 'none', minHeight: 0 }}
      />
    </Stack>
  );
}
