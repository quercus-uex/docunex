import { createBrowserRouter } from 'react-router';
import { ApplicationPage } from './applications/ApplicationPage';
import { ApplicationsPage } from './applications/ApplicationsPage';
import { RequireAuth } from './auth/RequireAuth';
import { DocumentsPage } from './documents/DocumentsPage';
import { AppLayout } from './layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { MeritEditPage } from './merits/MeritEditPage';
import { MeritsPage } from './merits/MeritsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PositionsPage } from './positions/PositionsPage';
import { ProfilePage } from './profile/ProfilePage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: 'documentos', element: <DocumentsPage /> },
      { path: 'meritos', element: <MeritsPage /> },
      { path: 'meritos/nuevo', element: <MeritEditPage /> },
      { path: 'meritos/:id', element: <MeritEditPage /> },
      { path: 'plazas', element: <PositionsPage /> },
      { path: 'solicitudes', element: <ApplicationsPage /> },
      { path: 'solicitudes/:id', element: <ApplicationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
