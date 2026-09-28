import { createBrowserRouter } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { DocumentsPage } from './documents/DocumentsPage';
import { AppLayout } from './layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PendingPage } from './pages/PendingPage';
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
      { path: 'meritos', element: <PendingPage title="Méritos" milestone="H2" /> },
      { path: 'plazas', element: <PendingPage title="Plazas" milestone="H4" /> },
      { path: 'solicitudes', element: <PendingPage title="Solicitudes" milestone="H4" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
