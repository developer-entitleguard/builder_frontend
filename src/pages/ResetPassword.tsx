import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSetPasswordForUserMutation } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';

/** Mirror of the backend PasswordPolicy — must match Signup.tsx. */
const PW_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /[0-9]/.test(p) },
  { label: 'A special character', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
  { label: 'No spaces', test: (p) => p.length > 0 && !/\s/.test(p) },
];

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [setPasswordForUser, { isLoading }] = useSetPasswordForUserMutation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const getEmailFromToken = (t: string): string => {
    try {
      const base64Url = t.split('.')[1];
      if (!base64Url) return '';
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload) as { mail?: string; email?: string };
      return payload.mail || payload.email || '';
    } catch (error) {
      console.error('Error decoding token:', error);
      return '';
    }
  };

  const email = getEmailFromToken(token);
  const passwordValid = useMemo(
    () => PW_RULES.every((r) => r.test(passwordData.password)),
    [passwordData.password]
  );

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.password !== passwordData.confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (!passwordValid) {
      toast({
        title: "Password doesn't meet the requirements",
        description: 'Please satisfy all the rules shown below the password field.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await setPasswordForUser({
        contact: '',
        email,
        loginType: 'email',
        otp: '',
        password: passwordData.password,
        token,
      }).unwrap();

      toast({
        title: 'Password updated',
        description: result.message || 'Your password has been updated successfully.',
      });
      setPasswordData({ password: '', confirmPassword: '' });
      navigate('/auth');
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.';

      if (error && typeof error === 'object') {
        if ('data' in error && (error as { data?: unknown }).data) {
          const data = (error as { data?: { message?: string } }).data;
          if (data && typeof data === 'object' && 'message' in data) {
            errorMessage = String((data as { message?: string }).message);
          }
        } else if ('message' in error) {
          errorMessage = String((error as { message?: string }).message);
        }
      }

      toast({
        title: 'Error updating password',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-1">
              <img
                src="/lovable-uploads/ead1c60a-bfad-4629-8a2b-b9a96ad2a53d.png"
                alt="EG BuildOS Logo"
                className="h-8 w-8 rounded-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">EG BuildOS</h1>
          </div>
          <p className="text-muted-foreground">Because Builders Deserve Clarity.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {email
                ? `Enter your new password for ${email}`
                : 'Enter your new password below to complete the reset process'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className="pl-10 pr-10"
                    value={passwordData.password}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {passwordData.password.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {PW_RULES.map((rule) => {
                      const ok = rule.test(passwordData.password);
                      return (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-2 text-xs ${
                            ok ? 'text-emerald-600' : 'text-muted-foreground'
                          }`}
                        >
                          <Check className={`h-3 w-3 ${ok ? 'opacity-100' : 'opacity-30'}`} />
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  !passwordValid ||
                  passwordData.password !== passwordData.confirmPassword
                }
              >
                {isLoading ? 'Saving...' : 'Save Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;