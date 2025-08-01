import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Building2, LogOut, LayoutDashboard } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-card border-b border-border shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Entitle Guard for Builders</h1>
                <p className="text-xs text-muted-foreground">Because Your Homeowners Deserve Clarity.</p>
              </div>
            </Link>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              
              <nav className="flex space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/onboarding">New Registration</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/items">Items</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/queries">Queries</Link>
                </Button>
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