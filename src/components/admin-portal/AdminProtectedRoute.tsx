import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

/**
 * Gate for the platform super-admin portal. Pure `adminData` presence check —
 * no builder/Supabase auth machinery (ProtectedRoute / RoleGate / useOrganization),
 * keeping the subtree self-contained for a future standalone frontend.
 */
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthed } = useAdminAuth();
  if (!isAdminAuthed) {
    return <Navigate to="/platform-admin/login" replace />;
  }
  return <>{children}</>;
};

export default AdminProtectedRoute;
