import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

/** الشاشات المتاحة للمندوب المقيّد بسيارته. */
export const VAN_MODE_PATHS = ['/my-van', '/sales-invoices'];

export default function ProtectedRoute({ children, permission }) {
  const { user, loading, hasPermission, vanMode } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (vanMode && location.pathname !== '/' && !VAN_MODE_PATHS.includes(location.pathname)) {
    return <Navigate to="/my-van" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        لا تملك صلاحية الوصول لهذه الصفحة / You don't have permission to access this page.
      </Box>
    );
  }

  return children;
}
