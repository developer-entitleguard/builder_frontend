import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storeBuilderSession } from '@/lib/auth/storeSession';
import { isNoSeatForPortal, type NoSeatForPortal, type SessionPayload } from '@/lib/auth/portalSession';
import {
  useSignInMutation,
  useUnifiedSignInMutation,
  useRequestLoginOtpMutation,
  useVerifyLoginOtpMutation,
  useSendVerifyMailMutation,
} from '@/store/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, KeyRound, ExternalLink } from 'lucide-react';
import { z } from 'zod';

/**
 * Unified sign-in is the default. `VITE_UNIFIED_AUTH=false` at build time keeps
 * the legacy `/unsecure/builderlogin` call for one release of rollback safety.
 * Both paths store the session through `storeBuilderSession`, so the browser
 * ends up identical either way.
 */
const UNIFIED_AUTH = import.meta.env.VITE_UNIFIED_AUTH !== 'false';

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

const otpEmailSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

const otpCodeSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
});

/** Pulls a human message out of an RTK Query / fetch error. */
const errorMessage = (error: unknown, fallback: string): string => {
  const message =
    error && typeof error === 'object' && 'data' in error
      ? (error as { data?: { message?: string } }).data?.message
      : error instanceof Error
        ? error.message
        : fallback;
  return String(message ?? fallback);
};

type View = 'signin' | 'forgot' | 'otp';

const Auth = () => {
  const [view, setView] = useState<View>('signin');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  // 403 NO_SEAT_FOR_PORTAL: the person is genuine but holds no Build seat.
  const [noSeat, setNoSeat] = useState<NoSeatForPortal | null>(null);
  const [signInMutation, { isLoading: isLegacySigningIn }] = useSignInMutation();
  const [unifiedSignIn, { isLoading: isUnifiedSigningIn }] = useUnifiedSignInMutation();
  const [requestLoginOtp, { isLoading: isSendingOtp }] = useRequestLoginOtpMutation();
  const [verifyLoginOtp, { isLoading: isVerifyingOtp }] = useVerifyLoginOtpMutation();
  const [sendVerifyMailMutation, { isLoading: isSendingResetLink }] = useSendVerifyMailMutation();
  const isSigningIn = isLegacySigningIn || isUnifiedSigningIn;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  // Set when the app bounced the user here after a session it couldn't renew.
  // Worth saying out loud — otherwise landing on the sign-in screen reads as
  // "my password stopped working".
  const sessionExpired = searchParams.get('expired') === '1';

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // "Email me a code instead" — two steps: email, then the 6-digit code.
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCodeSent, setOtpCodeSent] = useState(false);

  /**
   * Shared tail of every successful login response (legacy, unified, OTP):
   * store the session exactly as the app expects and go to the dashboard.
   */
  const completeSignIn = (response: { message?: string; data?: unknown } | undefined): void => {
    // API returns { success, message, data: { jwt, userInfo, builderOrganization?, ... } }
    const payload = response?.data as SessionPayload | undefined;
    if (payload?.jwt) {
      storeBuilderSession(payload);
      toast({
        title: "Welcome back!",
        description: response?.message ?? "You have been signed in successfully."
      });
      navigate('/dashboard', { replace: true });
    } else {
      toast({
        title: "Sign in failed",
        description: response?.message ?? "Invalid response from server.",
        variant: "destructive"
      });
    }
  };

  /** Common failure handling for login + verify: NO_SEAT_FOR_PORTAL or a toast. */
  const failSignIn = (error: unknown, fallback: string): void => {
    const body = error && typeof error === 'object' && 'data' in error ? (error as { data?: unknown }).data : null;
    if (isNoSeatForPortal(body)) {
      setNoSeat(body);
      return;
    }
    toast({
      title: "Sign in failed",
      description: errorMessage(error, fallback),
      variant: "destructive"
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setNoSeat(null);

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
      const response = UNIFIED_AUTH
        ? await unifiedSignIn({
            email: result.data.email,
            password: result.data.password,
            portal: 'BUILDER',
          }).unwrap()
        : await signInMutation({
            email: result.data.email,
            password: result.data.password,
          }).unwrap();
      completeSignIn(response);
    } catch (error: unknown) {
      failSignIn(error, "Sign in failed. Please check your email and password.");
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setNoSeat(null);

    const result = otpEmailSchema.safeParse({ email: otpEmail });
    if (!result.success) {
      setValidationErrors({ otpEmail: result.error.errors[0]?.message || 'Invalid email' });
      toast({
        title: "Validation Error",
        description: result.error.errors[0]?.message || "Please enter a valid email",
        variant: "destructive"
      });
      return;
    }

    try {
      await requestLoginOtp({ email: result.data.email }).unwrap();
      setOtpEmail(result.data.email);
      setOtpCode('');
      setOtpCodeSent(true);
      toast({
        title: "Code sent",
        description: "If that email has an account, a 6-digit code is on its way."
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: errorMessage(error, "Failed to send the code. Please try again."),
        variant: "destructive"
      });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setNoSeat(null);

    const result = otpCodeSchema.safeParse({ otp: otpCode });
    if (!result.success) {
      setValidationErrors({ otp: result.error.errors[0]?.message || 'Invalid code' });
      toast({
        title: "Validation Error",
        description: result.error.errors[0]?.message || "Please enter the 6-digit code",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await verifyLoginOtp({
        email: otpEmail,
        otp: result.data.otp,
        portal: 'BUILDER',
      }).unwrap();
      completeSignIn(response);
    } catch (error: unknown) {
      failSignIn(error, "That code didn't work. Please check it or request a new one.");
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
      setView('signin');
      setForgotPasswordEmail('');
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: errorMessage(error, "Failed to send reset link."),
        variant: "destructive"
      });
    }
  };

  const openOtpView = () => {
    setValidationErrors({});
    setNoSeat(null);
    setOtpEmail((current) => current || signInData.email);
    setOtpCodeSent(false);
    setOtpCode('');
    setView('otp');
  };

  const backToSignIn = () => {
    setValidationErrors({});
    setNoSeat(null);
    setView('signin');
  };

  // One "Open {portal}" link per portal the person can use; a person with two
  // seats on the same portal gets one link, not two.
  const otherPortalLinks = (() => {
    if (!noSeat) return [];
    const seen = new Set<string>();
    const links: { portalUrl: string; portalLabel: string }[] = [];
    for (const seat of noSeat.availableSeats ?? []) {
      if (!seat.portalUrl || seen.has(seat.portalUrl)) continue;
      seen.add(seat.portalUrl);
      links.push({ portalUrl: seat.portalUrl, portalLabel: seat.portalLabel });
    }
    return links;
  })();

  const noSeatNotice = noSeat && (
    <div
      role="alert"
      className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 space-y-2"
    >
      <p className="font-medium">Your account doesn't have access to the Build portal.</p>
      {otherPortalLinks.length > 0 ? (
        <>
          <p className="text-amber-800">You can sign in to the portal you do have access to:</p>
          <div className="flex flex-col gap-1.5">
            {otherPortalLinks.map((link) => (
              <a
                key={link.portalUrl}
                href={link.portalUrl}
                className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2 hover:text-amber-950"
              >
                Open {link.portalLabel}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ))}
          </div>
        </>
      ) : (
        <p className="text-amber-800">Contact your organization administrator if you need access.</p>
      )}
    </div>
  );

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
              {sessionExpired && view !== 'forgot' && (
                <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Your session timed out. This isn't a password problem — please sign in again.
                </p>
              )}
              {view === 'forgot' && (
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
                      {validationErrors.forgotEmail && (
                        <p className="text-sm text-destructive">{validationErrors.forgotEmail}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSendingResetLink}>
                      {isSendingResetLink ? "Sending..." : "Send Reset Link"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={backToSignIn}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                </div>
              )}
              {view === 'otp' && !otpCodeSent && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Sign in with a code</h3>
                    <p className="text-muted-foreground text-sm">
                      Enter your email address and we'll send you a one-time code.
                    </p>
                  </div>
                  {noSeatNotice}
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="otp-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                      {validationErrors.otpEmail && (
                        <p className="text-sm text-destructive">{validationErrors.otpEmail}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSendingOtp}>
                      {isSendingOtp ? "Sending..." : "Send Code"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={backToSignIn}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                </div>
              )}
              {view === 'otp' && otpCodeSent && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Check your email</h3>
                    <p className="text-muted-foreground text-sm">
                      We sent a 6-digit code to <span className="font-medium text-foreground">{otpEmail}</span>.
                      It expires in a few minutes.
                    </p>
                  </div>
                  {noSeatNotice}
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-code">Code</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="otp-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="123456"
                          className="pl-10 tracking-[0.3em]"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          autoFocus
                          required
                        />
                      </div>
                      {validationErrors.otp && (
                        <p className="text-sm text-destructive">{validationErrors.otp}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isVerifyingOtp}>
                      {isVerifyingOtp ? "Signing in..." : "Verify and Sign In"}
                    </Button>
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm text-muted-foreground"
                        disabled={isSendingOtp}
                        onClick={(e) => void handleRequestOtp(e)}
                      >
                        {isSendingOtp ? "Sending..." : "Resend code"}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm text-muted-foreground"
                        onClick={() => {
                          setValidationErrors({});
                          setNoSeat(null);
                          setOtpCodeSent(false);
                        }}
                      >
                        Use a different email
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={backToSignIn}
                    >
                      Use password instead
                    </Button>
                  </form>
                </div>
              )}
              {view === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  {noSeatNotice}
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
                  <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-muted-foreground"
                      onClick={() => {
                        setValidationErrors({});
                        setNoSeat(null);
                        setView('forgot');
                      }}
                    >
                      Forgot your password?
                    </Button>
                    {UNIFIED_AUTH && (
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={openOtpView}
                      >
                        Email me a code instead
                      </Button>
                    )}
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
