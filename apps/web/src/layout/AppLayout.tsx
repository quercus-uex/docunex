import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAward,
  IconBriefcase,
  IconFileStack,
  IconFiles,
  IconHome,
  IconLogout,
  IconSend,
  IconUser,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router';
import { useLogout, useSession } from '../auth/session';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: IconHome },
  { to: '/perfil', label: 'Perfil', icon: IconUser },
  { to: '/documentos', label: 'Documentos', icon: IconFiles },
  { to: '/meritos', label: 'Méritos', icon: IconAward },
  { to: '/plazas', label: 'Plazas', icon: IconBriefcase },
  { to: '/solicitudes', label: 'Solicitudes', icon: IconSend },
];

/**
 * Ancho máximo del contenido. Antes cada página se limitaba a 720–960 px y en un monitor grande
 * ocupaba una franja estrecha; ahora el contenido aprovecha el ancho disponible hasta este límite
 * (en `rem`, así que crece con el tamaño de letra).
 */
const CONTENT_MAX_WIDTH = 1600;

function isActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{ width: 272, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={{ base: 'md', md: 'xl' }}
    >
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <AppShell.Header>
        <Group h="100%" px={{ base: 'sm', sm: 'lg' }} justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              aria-label={opened ? 'Cerrar el menú' : 'Abrir el menú'}
              aria-expanded={opened}
              aria-controls="navegacion-principal"
            />
            <Group
              renderRoot={(props) => <Link to="/" {...props} />}
              gap="sm"
              wrap="nowrap"
              c="inherit"
              style={{ textDecoration: 'none' }}
            >
              <ThemeIcon size="lg" radius="md" aria-hidden>
                <IconFileStack size={22} />
              </ThemeIcon>
              <Box>
                <Title order={1} fz="h3" lh={1.1}>
                  DocUNEx
                </Title>
                <Text size="xs" c="dimmed" visibleFrom="md" lh={1.3}>
                  Expedientes de plazas PCI · Universidad de Extremadura
                </Text>
              </Box>
            </Group>
          </Group>
          <Group gap="md" wrap="nowrap">
            <Text size="sm" c="dimmed" visibleFrom="sm">
              {user?.email}
            </Text>
            <Button
              variant="default"
              leftSection={<IconLogout size={18} />}
              onClick={() => logout.mutate()}
              loading={logout.isPending}
              visibleFrom="xs"
            >
              Cerrar sesión
            </Button>
            {/* En móvil solo cabe el icono. */}
            <ActionIcon
              variant="default"
              size="input-md"
              aria-label="Cerrar sesión"
              onClick={() => logout.mutate()}
              loading={logout.isPending}
              hiddenFrom="xs"
            >
              <IconLogout size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" id="navegacion-principal" aria-label="Navegación principal">
        <Stack gap={4}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isActive(pathname, to);
            return (
              <NavLink
                key={to}
                component={Link}
                to={to}
                label={label}
                leftSection={<Icon size={22} stroke={1.75} aria-hidden />}
                active={active}
                aria-current={active ? 'page' : undefined}
                onClick={close}
              />
            );
          })}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main id="contenido" tabIndex={-1} style={{ outline: 'none' }}>
        <Box maw={CONTENT_MAX_WIDTH} mx="auto">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
