import { loginSchema } from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
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
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" p="xl" radius="md" w="100%" maw={380}>
        <form onSubmit={handleSubmit((values) => login.mutate(values))} noValidate>
          <Stack>
            <Title order={2} ta="center">
              DocUNEx
            </Title>
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
            <Button type="submit" loading={login.isPending} fullWidth>
              Iniciar sesión
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
