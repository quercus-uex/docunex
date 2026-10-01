import { loginSchema } from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconFileStack } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { useLogin, useSession } from '../auth/session';

export function LoginPage() {
  const { data: user } = useSession();
  const location = useLocation();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  return (
    <Center mih="100vh" p="md" bg="var(--mantine-color-default-hover)" component="main">
      <Paper withBorder shadow="md" p={{ base: 'lg', xs: 40 }} radius="lg" w="100%" maw={480}>
        <form onSubmit={handleSubmit((values) => login.mutate(values))} noValidate>
          <Stack gap="lg">
            <Stack gap="xs" align="center">
              <ThemeIcon size={56} radius="md" aria-hidden>
                <IconFileStack size={32} />
              </ThemeIcon>
              <Title order={1} ta="center">
                DocUNEx
              </Title>
              <Text c="dimmed" ta="center">
                Expedientes de plazas PCI de la Universidad de Extremadura
              </Text>
            </Stack>
            {login.error && (
              <Alert color="red" variant="light">
                {login.error.message}
              </Alert>
            )}
            <TextInput
              label="Correo electrónico"
              type="email"
              autoComplete="username"
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordInput
              label="Contraseña"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" size="lg" loading={login.isPending} fullWidth>
              Iniciar sesión
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
