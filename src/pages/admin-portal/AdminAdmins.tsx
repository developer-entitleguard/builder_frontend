import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import AdminPortalShell from './AdminPortalShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  useGetPlatformAdminsQuery,
  useCreatePlatformAdminMutation,
  useDeletePlatformAdminMutation,
} from '@/store/api/admin';

const blank = { firstName: '', lastName: '', email: '', password: '' };

const AdminAdmins = () => {
  const { toast } = useToast();
  const { admin: currentAdmin } = useAdminAuth();
  const { data: admins, isLoading } = useGetPlatformAdminsQuery();
  const [createAdmin, { isLoading: creating }] = useCreatePlatformAdminMutation();
  const [deleteAdmin] = useDeletePlatformAdminMutation();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const handleAdd = async () => {
    try {
      await createAdmin(form).unwrap();
      toast({ title: 'Super admin added', description: form.email });
      setForm(blank);
      setOpen(false);
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message ?? 'Could not add admin';
      toast({ title: 'Create failed', description: msg, variant: 'destructive' });
    }
  };

  const handleDelete = async (id?: string, email?: string) => {
    if (!id) return;
    try {
      await deleteAdmin(id).unwrap();
      toast({ title: 'Super admin removed', description: email });
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message ?? 'Could not remove admin';
      toast({ title: 'Remove failed', description: msg, variant: 'destructive' });
    }
  };

  return (
    <AdminPortalShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Super Admins</h1>
          <p className="text-muted-foreground">Manage who can access the platform admin portal.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add super admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add super admin</DialogTitle>
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
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={creating || !form.email || !form.password}>
                {creating ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : admins && admins.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {[a.firstName, a.lastName].filter(Boolean).join(' ') || '—'}
                  {a.id === currentAdmin?.id && <Badge variant="secondary" className="ml-2">You</Badge>}
                </TableCell>
                <TableCell>{a.email}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={a.id === currentAdmin?.id}
                    onClick={() => handleDelete(a.id, a.email)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No super admins.</p>
      )}
    </AdminPortalShell>
  );
};

export default AdminAdmins;
