import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignInMutation, useSendVerifyMailMutation } from '@/store/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetPasswordData, setResetPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const { signUp, resetPassword, updatePassword, setApiUser } = useAuth();
  const [signInMutation, { isLoading: isSignInLoading }] = useSignInMutation();
  const [sendVerifyMailMutation, { isLoading: isSendVerifyMailLoading }] = useSendVerifyMailMutation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    companyName: '',
    contactPerson: '',
    phone: ''
  });

  useEffect(() => {
    // Check if this is a password reset redirect
    if (searchParams.get('reset') === 'true') {
      setShowResetPassword(true);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signInMutation({
        email: signInData.email,
        password: signInData.password
      }).unwrap();
      
      // Set the user in auth context for navigation
      if (result.data?.userInfo) {
        setApiUser(result.data.userInfo);
        localStorage.setItem('userData', JSON.stringify({
          userInfo: result.data.userInfo,
          jwt: result.data.jwt,
          logged: result.data.logged,
          createdAt: result.data.createdAt
        }));
      }
      
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully."
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred.";
      
      if (error && typeof error === 'object') {
        if ('data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
          errorMessage = String(error.data.message);
        } else if ('message' in error) {
          errorMessage = String(error.message);
        }
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signUp(
        signUpData.email, 
        signUpData.password,
        {
          company_name: signUpData.companyName,
          contact_person: signUpData.contactPerson,
          phone: signUpData.phone
        }
      );

      if (error) {
        toast({
          title: "Sign up failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive"
        });
      } else {
        localStorage.setItem('userData', JSON.stringify({
          userInfo: {
            name: signUpData.contactPerson,
            email: signUpData.email,
            contact: signUpData.phone,
            source: {
              name: signUpData.companyName
            }
          },
          logged: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }));
        
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully."
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await sendVerifyMailMutation({ email: forgotPasswordEmail }).unwrap();
      
      toast({
        title: "Reset link sent",
        description: result.message || "Check your email for password reset instructions."
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred.";
      
      if (error && typeof error === 'object') {
        if ('data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
          errorMessage = String(error.data.message);
        } else if ('message' in error) {
          errorMessage = String(error.message);
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updatePassword(resetPasswordData.password);
      
      if (error) {
        toast({
          title: "Error updating password",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been updated successfully."
        });
        setShowResetPassword(false);
        setResetPasswordData({ password: '', confirmPassword: '' });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground">Entitle Guard for Builders</h1>
          </div>
          <p className="text-muted-foreground">Because Your Homeowners Deserve Clarity.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
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
                  <Button type="submit" className="w-full" disabled={isLoading || isSendVerifyMailLoading}>
                    {isLoading || isSendVerifyMailLoading ? "Sending..." : "Send Reset Link"}
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
            ) : showResetPassword ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Set New Password</h3>
                  <p className="text-muted-foreground text-sm">
                    Enter your new password below.
                  </p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        className="pl-10"
                        value={resetPasswordData.password}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        className="pl-10"
                        value={resetPasswordData.confirmPassword}
                        onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              
              <TabsContent value="signin">
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      placeholder="Your password"
                      className="pl-10 pr-10"
                        value={signInData.password}
                        onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || isSignInLoading}>
                    {isLoading || isSignInLoading ? "Signing in..." : "Sign In"}
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
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company-name"
                        placeholder="Your Construction Company"
                        className="pl-10"
                        value={signUpData.companyName}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, companyName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-person">Contact Person</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contact-person"
                        placeholder="John Smith"
                        className="pl-10"
                        value={signUpData.contactPerson}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, contactPerson: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="(555) 123-4567"
                        className="pl-10"
                        value={signUpData.phone}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        className="pl-10"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;