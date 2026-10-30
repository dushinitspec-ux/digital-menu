import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
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
import { Spinner, ToastProvider } from './ui';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <SessionProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
