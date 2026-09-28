import { Center, Drawer, Loader } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { type ReactNode, Suspense } from 'react';

/** Panel lateral para las vistas previas en PDF; su contenido se carga bajo demanda. */
export function PreviewDrawer({
  opened,
  onClose,
  title,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const wide = useMediaQuery('(min-width: 62em)');
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="right"
      size={wide ? 'xl' : '100%'}
      styles={{
        content: { display: 'flex', flexDirection: 'column' },
        body: { flex: 1, minHeight: 0 },
      }}
    >
      <Suspense
        fallback={
          <Center h="100%">
            <Loader />
          </Center>
        }
      >
        {opened && children}
      </Suspense>
    </Drawer>
  );
}
