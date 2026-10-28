import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// roles: lista de roles permitidos (si no se pasa, alcanza con tener sesión)
// superadmin: además exige que el admin sea superadmin
export default function ProtectedRoute({ roles, superadmin = false }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;
  if (superadmin && !user.es_superadmin) return <Navigate to="/" replace />;

  return <Outlet />;
}