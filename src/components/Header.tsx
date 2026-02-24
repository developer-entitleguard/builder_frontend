import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { RegistrationTypeDialog } from "@/components/RegistrationTypeDialog";
import OrganizationSelector from "@/components/OrganizationSelector";
import { Building2, LogOut, LayoutDashboard, FolderKanban, Shield, Eye } from "lucide-react";

const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!(parsed?.jwt);
  } catch {
    return false;
  }
};

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, currentOrganization, hasMultipleOrgs, impersonatedOrganization, isImpersonating, setImpersonatedOrganization } = useOrganization();
  const location = useLocation();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAuthenticated = !!user || hasBuilderAuth();

  const showOrgNavItems = !isSuperAdmin || isImpersonating;

  const handleStopImpersonation = () => {
    setImpersonatedOrganization(null);
  };

  const handleSignOut = () => {
    if (hasBuilderAuth()) {
      localStorage.removeItem("userData");
      navigate("/auth", { replace: true });
    } else {
      signOut();
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-soft">
      {impersonatedOrganization && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1 text-center">
          <span className="text-sm text-primary flex items-center justify-center gap-2">
            <Eye className="h-3 w-3" />
            Impersonating: <strong>{impersonatedOrganization.name}</strong>
            <button 
              onClick={handleStopImpersonation} 
              className="underline ml-2 hover:text-primary/80"
            >
              Stop
            </button>
          </span>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="p-1">
                <img 
                  src="/images/feature-home-1.jpg" 
                  alt="Entitle Guard for Builders Logo" 
                  className="h-10 w-10 rounded-lg object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Entitle Guard for Builders</h1>
              </div>
            </Link>
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              {hasMultipleOrgs && <OrganizationSelector />}
              
              {currentOrganization && !hasMultipleOrgs && !isSuperAdmin && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 mr-1" />
                  {currentOrganization.name}
                </div>
              )}

              {isSuperAdmin && (
                <Badge variant="outline" className="text-primary border-primary">
                  <Shield className="h-3 w-3 mr-1" />
                  Super Admin
                </Badge>
              )}
              
              <Button 
                asChild 
                variant={location.pathname === '/dashboard' ? "default" : "secondary"}
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              
              <nav className="flex space-x-2">
                {showOrgNavItems && (
                  <>
                    <Button 
                      variant={location.pathname.startsWith('/projects') ? "default" : "ghost"} 
                      size="sm" 
                      asChild
                    >
                      <Link to="/projects">
                        <FolderKanban className="h-4 w-4 mr-1" />
                        Projects
                      </Link>
                    </Button>
                    <Button 
                      variant={location.pathname === '/onboarding' ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setDialogOpen(true)}
                    >
                      New Registration
                    </Button>
                    <Button 
                      variant={location.pathname === '/items' ? "default" : "ghost"} 
                      size="sm" 
                      asChild
                    >
                      <Link to="/items">Items</Link>
                    </Button>
                    <Button 
                      variant={location.pathname === '/queries' ? "default" : "ghost"} 
                      size="sm" 
                      asChild
                    >
                      <Link to="/queries">Queries</Link>
                    </Button>
                  </>
                )}
                {isAdmin && showOrgNavItems && (
                  <Button 
                    variant={location.pathname === '/admin' ? "default" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link to="/admin">Admin</Link>
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button 
                    variant={location.pathname === '/superadmin' ? "default" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link to="/superadmin">
                      <Shield className="h-4 w-4 mr-1" />
                      Super Admin
                    </Link>
                  </Button>
                )}
              </nav>
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>

      <RegistrationTypeDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
      />
    </header>
  );
};
export default Header;