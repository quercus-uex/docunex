import { Alert, Center, Loader } from '@mantine/core';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from './session';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending, error } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (error) {
    return (
      <Center h="100vh" p="md">
        <Alert color="red" title="No se pudo contactar con la API">
          {error.message}
        </Alert>
      </Center>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
