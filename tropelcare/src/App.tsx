import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppShell } from './layout/AppShell';
import { Spinner } from './components/ui/Spinner';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';

const TropelsPage = lazy(() => import('./features/tropels/TropelsPage'));
const TropelDetailPage = lazy(() => import('./features/tropels/TropelDetailPage'));
const SignalsFeedPage = lazy(() => import('./features/signals/SignalsFeedPage'));
const SectorsPage = lazy(() => import('./features/sectors/SectorsPage'));
const SectorStoryPage = lazy(() => import('./features/sectors/SectorStoryPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Spinner size="lg" />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="tropels" element={<TropelsPage />} />
                <Route path="tropels/:id" element={<TropelDetailPage />} />
                <Route path="signals" element={<SignalsFeedPage />} />
                <Route path="sectors" element={<SectorsPage />} />
                <Route path="sectors/:id/story" element={<SectorStoryPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
