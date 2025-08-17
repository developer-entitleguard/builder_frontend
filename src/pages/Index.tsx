import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Users, Shield } from "lucide-react";
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Building2 className="h-8 w-8 text-primary animate-pulse" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/ead1c60a-bfad-4629-8a2b-b9a96ad2a53d.png" 
                alt="Entitle Guard for Builders Logo" 
                className="h-8 w-8 rounded mr-3"
              />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Entitle Guard for Builders</h1>
                <p className="text-sm text-muted-foreground">Handover Made Simple. Entitlements Made Clear</p>
              </div>
            </div>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Streamline Your
            <span className="text-primary block">Handover Process</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Create comprehensive warranty documentation packages for your homebuyers. 
            Manage entitlements, track progress, and deliver professional warranty packages with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything you need to manage homeowner warranties
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From customer onboarding to document delivery, Entitle Guard for Builders streamlines your entire warranty process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>
                  Easily manage all your homeowner information and property details in one centralized dashboard.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Document Organization</CardTitle>
                <CardDescription>
                  Upload and organize warranty documents, manuals, and certificates for each property and customer.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Warranty Tracking</CardTitle>
                <CardDescription>
                  Track warranty status, send entitlements to homeowners, and monitor delivery confirmations.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to get started?</CardTitle>
              <CardDescription>
                Join builders who trust Entitle Guard for Builders to manage their warranty processes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => navigate('/auth')} className="w-full sm:w-auto">
                Start Your Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>;
};
export default Index;