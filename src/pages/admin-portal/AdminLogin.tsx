import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminLoginMutation } from '@/store/api/admin';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdminAuthed, setSession } = useAdminAuth();
  const [adminLogin, { isLoading }] = useAdminLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAdminAuthed) {
    return <Navigate to="/platform-admin/orgs" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminLogin({ email, password }).unwrap();
      if (res.success && res.data?.jwt) {
        setSession(res.data);
        navigate('/platform-admin/orgs', { replace: true });
      } else {
        toast({ title: 'Login failed', description: res.message || 'Invalid credentials', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Login failed', description: 'Could not reach the server', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Platform Admin</CardTitle>
          <CardDescription>Super-admin sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
