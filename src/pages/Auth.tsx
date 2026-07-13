import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USER_DATA_EVENT } from '@/hooks/useOrganization';
import { useSignInMutation, useSendVerifyMailMutation } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock } from 'lucide-react';
import { z } from 'zod';

const handleRequestAccess = () => {
  const subject = encodeURIComponent("Builder Playground Access Request");
  const body = encodeURIComponent(`Hi,

I'd like to request access to Builder Playground.

Name: 
Company: 
Role: 
Location: 
Project Types: 
Estimated Annual Volume: 

Thanks`);
  window.location.href = `mailto:support@entitleguard.com?subject=${subject}&body=${body}`;
};

// Validation schemas
const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

const Auth = () => {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [signInMutation, { isLoading: isSigningIn }] = useSignInMutation();
  const [sendVerifyMailMutation, { isLoading: isSendingResetLink }] = useSendVerifyMailMutation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate input
    const result = signInSchema.safeParse(signInData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: result.error.errors[0]?.message || "Please check your input",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await signInMutation({
        email: result.data.email,
        password: result.data.password,
      }).unwrap();

      // API returns { success, message, data: { jwt, userInfo, builderOrganization?, ... } }
      if (response?.data?.jwt) {
        const userInfo = response.data.userInfo ?? {};
        const builderOrg =
          response.data.userInfo?.builderOrganization ??
          (response.data as { builderOrganization?: unknown }).builderOrganization;
        localStorage.setItem(
          "userData",
          JSON.stringify({
            jwt: response.data.jwt,
            ...userInfo,
            builderOrganization: builderOrg,
          })
        );
        // Notify OrganizationProvider so it picks up the new role + org
        // before we navigate. Without this the provider's mount effect (which
        // already ran with an empty localStorage) leaves currentRole=null,
        // and guarded pages like /admin briefly flash "Access denied".
        window.dispatchEvent(new Event(USER_DATA_EVENT));
        toast({
          title: "Welcome back!",
          description: response.message ?? "You have been signed in successfully."
        });
        navigate('/dashboard', { replace: true });
      } else {
        toast({
          title: "Sign in failed",
          description: response?.message ?? "Invalid response from server.",
          variant: "destructive"
        });
      }
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : error instanceof Error
            ? error.message
            : "Sign in failed. Please check your email and password.";
      toast({
        title: "Sign in failed",
        description: String(message),
        variant: "destructive"
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    const result = forgotPasswordSchema.safeParse({ email: forgotPasswordEmail });
    if (!result.success) {
      setValidationErrors({ forgotEmail: result.error.errors[0]?.message || 'Invalid email' });
      toast({
        title: "Validation Error",
        description: result.error.errors[0]?.message || "Please enter a valid email",
        variant: "destructive"
      });
      return;
    }

    try {
      await sendVerifyMailMutation({ email: result.data.email }).unwrap();
      toast({
        title: "Reset link sent",
        description: "Check your email for password reset instructions."
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : error instanceof Error
            ? error.message
            : "Failed to send reset link.";
      toast({
        title: "Error",
        description: String(message),
        variant: "destructive"
      });
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate("/")}
            >
              <img
                src="/lovable-uploads/ead1c60a-bfad-4629-8a2b-b9a96ad2a53d.png"
                alt="EG BuildOS Logo"
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div>
                <span className="text-xl font-semibold text-white">
                  EG BuildOS
                </span>
                <p className="text-xs text-white/70">
                  Handover Made Simple. Entitlements Made Clear.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={handleRequestAccess}
                className="text-white/90 hover:text-white hover:bg-white/10 bg-transparent"
              >
                Request Access
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-muted-foreground">Sign in to manage your projects and entitlements.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>
                Sign in to your account to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showForgotPassword ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Reset Password</h3>
                    <p className="text-muted-foreground text-sm">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSendingResetLink}>
                      {isSendingResetLink ? "Sending..." : "Send Reset Link"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={signInData.email}
                        onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-sm text-destructive">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Your password"
                        className="pl-10"
                        value={signInData.password}
                        onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                    {validationErrors.password && (
                      <p className="text-sm text-destructive">{validationErrors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningIn}>
                    {isSigningIn ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-sm text-muted-foreground"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            New business?{" "}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => navigate("/signup")}
            >
              Create an account
            </Button>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-1">
            Or contact your organization administrator if you need access.
          </p>
        </div>
      </div>

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

export default Auth;
