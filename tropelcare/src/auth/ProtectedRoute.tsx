import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../components/ui/Spinner';

export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <Spinner size="lg" />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <Outlet />;
}
