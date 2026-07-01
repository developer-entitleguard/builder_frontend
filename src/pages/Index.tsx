import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  ClipboardCheck,
  Calculator,
  Home,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Users,
  Shield,
  Clock,
  FolderKanban,
  Sparkles,
  ChevronRight,
} from "lucide-react";

// Treat builder JWT login as authenticated (even without Supabase user)
const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!parsed?.jwt;
  } catch {
    return false;
  }
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const builderAuth = hasBuilderAuth();

  useEffect(() => {
    // If builder JWT exists, always send to dashboard (builder app),
    // regardless of Supabase auth state.
    if (builderAuth) {
      navigate('/dashboard');
      return;
    }

    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, builderAuth, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Building2 className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  const capabilities = [
    {
      icon: FolderKanban,
      title: "Project & Activity Management",
      description: "Create property-based projects with structured activities, progress tracking, and real-time updates. Keep your entire team aligned from foundation to finishing.",
      image: "/images/feature-home-1.jpg"
    },
    {
      icon: ClipboardCheck,
      title: "Approvals & Governance",
      description: "Request, approve, and track scope changes, variations, and payment milestones. Every decision is logged with a complete audit trail.",
      image: "/images/feature-home-2.jpg"
    },
    {
      icon: Calculator,
      title: "AI-Assisted Pricing",
      description: "Generate cost estimates using Australian building indices. Link costs to activities, apply buffers and margins, and refine with real BOM data.",
      image: "/images/feature-home-3.jpg"
    },
    {
      icon: Home,
      title: "Automated Homeowner Handover",
      description: "Generate a complete digital home record including warranties, manuals, approvals, and project history. Delivered automatically to your customers.",
      isHighlighted: true
    }
  ];

  const steps = [
    { number: "01", title: "Create Project", description: "Set up property details and timeline" },
    { number: "02", title: "Manage Activities", description: "Track progress and post updates" },
    { number: "03", title: "Request Approvals", description: "Get sign-off on changes" },
    { number: "04", title: "Generate Pricing", description: "Build AI-assisted cost estimates" },
    { number: "05", title: "Automate Handover", description: "Deliver digital home records" }
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Reduce Handover Admin",
      description: "Eliminate manual document chasing. Everything is collected during the build and delivered automatically."
    },
    {
      icon: Users,
      title: "Improve Homeowner Experience",
      description: "Give buyers a professional, digital record of their home. No more lost warranties or missing manuals."
    },
    {
      icon: Shield,
      title: "Built-in Transparency",
      description: "Every approval, change, and decision is logged. Protect your business with a complete audit trail."
    },
    {
      icon: FileCheck,
      title: "Long-term Value",
      description: "Create lasting relationships with homeowners. A quality handover reflects the quality of your build."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/ead1c60a-bfad-4629-8a2b-b9a96ad2a53d.png" 
                alt="EG BuildOS Logo" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div>
                <span className="text-xl font-semibold text-white">EG BuildOS</span>
                <p className="text-xs text-white/70">Handover Made Simple. Entitlements Made Clear.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="text-white/90 hover:text-white hover:bg-white/10 bg-transparent"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/signup')}
                className="bg-white text-primary hover:bg-white/90"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-home-1.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/60" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              From build planning to homeowner handover — all in one platform
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-10 leading-relaxed">
              Manage projects, approvals, and AI-assisted pricing, then automatically hand over a digital home record to your customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/signup')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6"
              >
                Sign Up — free for 3 months
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="border-2 border-white text-white bg-transparent hover:bg-white/10 text-lg px-8 py-6"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="h-8 w-8 text-white/60 rotate-90" />
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to build and handover with confidence
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform for managing your build from first foundation to final handover.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {capabilities.map((capability, index) => (
              <Card 
                key={index}
                className={`overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  capability.isHighlighted 
                    ? 'md:col-span-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10' 
                    : 'hover:border-primary/30'
                }`}
              >
                <div className={`flex flex-col ${capability.isHighlighted ? 'md:flex-row' : ''}`}>
                  {capability.image && (
                    <div className={`${capability.isHighlighted ? 'md:w-1/2' : ''}`}>
                      <img 
                        src={capability.image} 
                        alt={capability.title}
                        className="w-full h-48 md:h-64 object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className={`${capability.isHighlighted ? 'md:w-1/2 flex flex-col justify-center' : ''}`}>
                    <div className={`flex items-center gap-3 mb-3 ${capability.isHighlighted ? 'text-primary' : ''}`}>
                      <div className={`p-3 rounded-xl ${capability.isHighlighted ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <capability.icon className="h-6 w-6" />
                      </div>
                      {capability.isHighlighted && (
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                          Key Differentiator
                        </span>
                      )}
                    </div>
                    <CardTitle className={`text-xl ${capability.isHighlighted ? 'text-2xl' : ''}`}>
                      {capability.title}
                    </CardTitle>
                    <CardDescription className={`text-base mt-2 ${capability.isHighlighted ? 'text-lg text-foreground/80' : ''}`}>
                      {capability.description}
                    </CardDescription>
                    {capability.isHighlighted && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {['Warranties', 'Manuals', 'Approvals', 'Project Records'].map((tag) => (
                          <span key={tag} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A simple, structured workflow from project start to homeowner handover.
            </p>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-muted via-primary to-muted -translate-y-1/2" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {steps.map((step, index) => (
                <div key={index} className="relative group">
                  <Card className="text-center p-6 h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 bg-background">
                    <div className="relative mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <span className="text-2xl font-bold text-primary group-hover:text-primary-foreground">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </Card>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ChevronRight className="h-6 w-6 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Builders Use This Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why builders use Entitle Guard
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built by people who understand the building industry. Designed for how you actually work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow border-0 bg-card">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <benefit.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sign Up Section */}
      <section className="py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-12 md:p-16 shadow-2xl">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
              Create your account in minutes — free for your first 3 months. After that, pricing depends on the capabilities you use.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/signup')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-6"
              >
                Sign Up — free for 3 months
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="text-slate-400 text-sm mt-6">
              Already have an account?{' '}
              <button onClick={() => navigate('/auth')} className="text-white underline hover:no-underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section 
        className="relative py-32 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/feature-home-3.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-900/90" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start your next build with the end in mind
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            From the first activity to the final handover, give your customers an experience that matches the quality of your builds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6"
            >
              Sign Up — free for 3 months
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="border-2 border-white text-white bg-transparent hover:bg-white/10 text-lg px-8 py-6"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/ead1c60a-bfad-4629-8a2b-b9a96ad2a53d.png" 
                alt="EG BuildOS Logo" 
                className="h-8 w-8 rounded mr-3"
              />
              <div>
                <span className="text-white font-medium">EG BuildOS</span>
                <p className="text-xs text-slate-400">Handover Made Simple. Entitlements Made Clear.</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Entitle Guard. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a 
                href="mailto:support@entitleguard.com" 
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                support@entitleguard.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
