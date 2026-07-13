import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, Building2, Users, LogOut, BarChart3, Database } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/platform-admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/platform-admin/orgs', label: 'Organizations', icon: Building2 },
  { to: '/platform-admin/records', label: 'Records', icon: Database },
  { to: '/platform-admin/admins', label: 'Super Admins', icon: Users },
];

/**
 * Top-nav shell for the platform super-admin portal. Self-contained (no builder
 * Header / useOrganization) so the whole subtree lifts cleanly into a standalone
 * frontend later.
 */
const AdminPortalShell = ({ children }: { children: React.ReactNode }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/platform-admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-semibold">
                <Shield className="h-5 w-5 text-primary" />
                <span>Platform Admin</span>
              </div>
              <nav className="hidden sm:flex items-center gap-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-muted-foreground">{admin?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
};

export default AdminPortalShell;
