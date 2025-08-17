import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Building2, LogOut, LayoutDashboard } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useOrganization();
  const location = useLocation();

  return (
    <header className="bg-card border-b border-border shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="p-1">
                <img 
                  src="/lovable-uploads/ead1c60a-bfad-4629-8a2b-b9a96ad2a53d.png" 
                  alt="Entitle Guard for Builders Logo" 
                  className="h-10 w-10 rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Entitle Guard for Builders</h1>
              </div>
            </Link>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
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
                <Button 
                  variant={location.pathname === '/onboarding' ? "default" : "ghost"} 
                  size="sm" 
                  asChild
                >
                  <Link to="/onboarding">New Registration</Link>
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
                {isAdmin && (
                  <Button 
                    variant={location.pathname === '/admin' ? "default" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link to="/admin">Admin</Link>
                  </Button>
                )}
              </nav>
              
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;