import { useState } from 'react';
import { KeyRound, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAdminCatalogQuery,
  useGetAdminOrgUsersQuery,
  useUpsertAdminOrgUserMutation,
  useResetAdminOrgUserPasswordMutation,
  useDeleteAdminOrgUserMutation,
  type AdminUser,
} from '@/store/api/admin';

interface Props {
  orgType: string;
  orgId: string;
}

const blankUser = { firstName: '', lastName: '', email: '', contact: '', role: '', password: '' };

const OrgUsers = ({ orgType, orgId }: Props) => {
  const { toast } = useToast();
  const { data: catalog } = useGetAdminCatalogQuery();
  const { data: users, isLoading } = useGetAdminOrgUsersQuery({ orgType, orgId });
  const [upsertUser, { isLoading: creating }] = useUpsertAdminOrgUserMutation();
  const [resetPassword] = useResetAdminOrgUserPasswordMutation();
  const [deleteUser] = useDeleteAdminOrgUserMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankUser);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const roles = catalog?.rolesByOrgType?.[orgType] ?? [];

  const handleAdd = async () => {
    try {
      await upsertUser({ orgType, orgId, body: form }).unwrap();
      toast({ title: 'User created', description: form.email });
      setForm(blankUser);
      setAddOpen(false);
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message ?? 'Could not create user';
      toast({ title: 'Create failed', description: msg, variant: 'destructive' });
    }
  };

  const handleReset = async () => {
    if (!resetFor?.id) return;
    try {
      await resetPassword({ orgType, orgId, id: resetFor.id, password: newPassword }).unwrap();
      toast({ title: 'Password updated', description: resetFor.email });
      setResetFor(null);
      setNewPassword('');
    } catch {
      toast({ title: 'Reset failed', description: 'Could not update password', variant: 'destructive' });
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!user.id) return;
    try {
      await deleteUser({ orgType, orgId, id: user.id }).unwrap();
      toast({ title: 'User deactivated', description: user.email });
    } catch {
      toast({ title: 'Delete failed', description: 'Could not deactivate user', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userContact">Contact</Label>
                <Input
                  id="userContact"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userPassword">Initial password</Label>
                <Input
                  id="userPassword"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={creating || !form.email || !form.role || !form.password}>
                {creating ? 'Creating…' : 'Create user'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6">Loading…</p>
      ) : users && users.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{u.role}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setResetFor(u)}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(u)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground py-6">No users yet.</p>
      )}

      <Dialog open={!!resetFor} onOpenChange={(open) => !open && setResetFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password — {resetFor?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resetPassword">New password</Label>
            <Input
              id="resetPassword"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleReset} disabled={!newPassword}>
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgUsers;
