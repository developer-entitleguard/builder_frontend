import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  status: string;
  expires_at: string;
  organization?: {
    name: string;
  };
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  
  // Registration form state (for new users)
  const [isNewUser, setIsNewUser] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
  });

  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      fetchInvitation();
    } else {
      setError("Invalid invitation link");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // If user is already logged in, check if they can accept
    if (user && invitation) {
      if (user.email?.toLowerCase() === invitation.email.toLowerCase()) {
        // User is logged in with the invited email - can accept directly
        setIsNewUser(false);
      } else {
        setError("Please log out and use the email address this invitation was sent to.");
      }
    }
  }, [user, invitation]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select(`
          id,
          email,
          organization_id,
          role,
          status,
          expires_at,
          builder_organizations!invitations_organization_id_fkey (name)
        `)
        .eq("token", token)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Invitation not found");
        return;
      }

      if (data.status !== "pending") {
        setError(`This invitation has already been ${data.status}`);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired");
        return;
      }

      // Transform the data to match our interface
      const transformedData: Invitation = {
        ...data,
        organization: data.builder_organizations ? { name: (data.builder_organizations as any).name } : undefined,
      };

      setInvitation(transformedData);
      
      // Check if user exists with this email
      if (!user) {
        setIsNewUser(true);
      }
    } catch (err: any) {
      console.error("Error fetching invitation:", err);
      setError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptExistingUser = async () => {
    if (!invitation || !user) return;
    
    setAccepting(true);
    try {
      // Use edge function to accept invitation (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { token: searchParams.get("token") },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Welcome!",
        description: data.message || `You've joined ${invitation.organization?.name || "the organization"}`,
      });

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setAccepting(true);
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            contact_person: formData.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create account");

      // Update profile with additional info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          contact_person: formData.fullName,
          phone: formData.phone || null,
        })
        .eq("user_id", authData.user.id);

      if (profileError) console.error("Profile update error:", profileError);

      // Use edge function to accept invitation (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { token: searchParams.get("token") },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Account Created!",
        description: data.message || `Welcome to ${invitation.organization?.name || "the organization"}. Please check your email to verify your account.`,
      });

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error registering:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/auth")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  // User is logged in with correct email - show accept button
  if (user && !isNewUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Join {invitation.organization?.name}</CardTitle>
            <CardDescription>
              You've been invited to join as {invitation.role === 'admin' ? 'an Administrator' : 'a Team Member'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleAcceptExistingUser}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // New user - show registration form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Join {invitation.organization?.name}</CardTitle>
          <CardDescription>
            Create your account to join as {invitation.role === 'admin' ? 'an Administrator' : 'a Team Member'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegisterAndAccept} className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{invitation.email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="04XX XXX XXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={accepting}>
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Account & Join
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                Log in
              </Button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
