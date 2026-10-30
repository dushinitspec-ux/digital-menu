import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type ReactNode } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { ApiError } from './api';
import { AppShell } from './layout';
import { AuditPage } from './pages/Audit';
import { LoginPage, RegisterPage } from './pages/Auth';
import { LocationsPage } from './pages/Locations';
import { MediaPage } from './pages/Media';
import { MenuPage } from './pages/Menu';
import { SceneEditorPage } from './pages/SceneEditor';
import { ScenesPage } from './pages/Scenes';
import { ScreenDetailPage } from './pages/ScreenDetail';
import { ScreensPage } from './pages/Screens';
import { SettingsPage } from './pages/Settings';
import { TeamPage } from './pages/Team';
import { SessionProvider, useSession } from './session';
import './styles.css';
import { useT } from './i18n';
import { ConfirmProvider, Spinner, ToastProvider } from './ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const { me, org, loading } = useSession();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!me || !org) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/menu" replace />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/scenes" element={<ScenesPage />} />
        <Route path="/scenes/:id" element={<SceneEditorPage />} />
        <Route path="/screens" element={<ScreensPage />} />
        <Route path="/screens/:id" element={<ScreenDetailPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/menu" replace />} />
    </Routes>
  );
}

function Confirmations({ children }: { children: ReactNode }) {
  const t = useT();
  return <ConfirmProvider labels={() => ({ ok: t('delete'), cancel: t('cancel') })}>{children}</ConfirmProvider>;
}

/** Вся панель. router="memory" — для встраивания (демо-страница), где адресная строка недоступна. */
export function AdminRoot({ router = 'browser', initialPath = '/menu' }: { router?: 'browser' | 'memory'; initialPath?: string }) {
  const app = (
    <SessionProvider>
      <ToastProvider>
        <Confirmations>
          <App />
        </Confirmations>
      </ToastProvider>
    </SessionProvider>
  );
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        {router === 'browser' ? (
          <BrowserRouter basename="/admin">{app}</BrowserRouter>
        ) : (
          <MemoryRouter initialEntries={[initialPath]}>{app}</MemoryRouter>
        )}
      </QueryClientProvider>
    </StrictMode>
  );
}
