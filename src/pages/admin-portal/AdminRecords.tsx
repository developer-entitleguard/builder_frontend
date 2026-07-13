import { useState } from 'react';
import AdminPortalShell from './AdminPortalShell';
import {
  useGetRegistrationsQuery,
  useSoftDeleteRegistrationMutation,
  useHardDeleteRegistrationMutation,
  useAnonymiseRegistrationMutation,
  useBulkSoftDeleteMutation,
  fetchDependencies,
  type RegistrationRecord,
} from '@/store/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const AdminRecords = () => {
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: records, isLoading, refetch } = useGetRegistrationsQuery(search, includeInactive);
  const [softDelete] = useSoftDeleteRegistrationMutation();
  const [hardDelete] = useHardDeleteRegistrationMutation();
  const [anonymise] = useAnonymiseRegistrationMutation();
  const [bulkSoftDelete] = useBulkSoftDeleteMutation();

  const rows = records ?? [];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const askReason = (action: string, name: string) =>
    window.prompt(`Reason for ${action} "${name}" (recorded in the audit log):`, '');

  const run = async (fn: () => Promise<{ message: string }>, ok: string) => {
    try {
      const res = await fn();
      toast({ title: ok, description: res.message });
      refetch();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'data' in e
        ? (e as { data?: { message?: string } }).data?.message
        : e instanceof Error ? e.message : 'Action failed';
      toast({ title: 'Action failed', description: String(msg), variant: 'destructive' });
    }
  };

  const onSoftDelete = (r: RegistrationRecord) => {
    const reason = askReason('deactivating', label(r));
    if (reason == null) return;
    run(() => softDelete({ id: r.id, reason }).unwrap(), 'Registration deactivated');
  };

  const onAnonymise = (r: RegistrationRecord) => {
    const reason = askReason('anonymising', label(r));
    if (reason == null) return;
    run(() => anonymise({ id: r.id, reason }).unwrap(), 'Personal data removed');
  };

  const onHardDelete = async (r: RegistrationRecord) => {
    const dep = await fetchDependencies(r.id);
    if (!dep.canHardDelete) {
      toast({
        title: 'Permanent delete blocked',
        description: `Has ${dep.blockers.join(', ')}. Use deactivate or anonymise instead.`,
        variant: 'destructive',
      });
      return;
    }
    if (!window.confirm(`Permanently delete "${label(r)}"? This cannot be undone.`)) return;
    const reason = askReason('permanently deleting', label(r));
    if (reason == null) return;
    run(() => hardDelete({ id: r.id, reason }).unwrap(), 'Registration permanently deleted');
  };

  const onBulkSoftDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const reason = window.prompt(`Reason for deactivating ${ids.length} record(s):`, '');
    if (reason == null) return;
    try {
      const res = await bulkSoftDelete({ ids, reason }).unwrap();
      toast({
        title: 'Bulk deactivation complete',
        description: `${res.deleted} deactivated, ${res.skipped} skipped of ${res.requested}.`,
      });
      setSelected(new Set());
      refetch();
    } catch {
      toast({ title: 'Bulk action failed', variant: 'destructive' });
    }
  };

  return (
    <AdminPortalShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Records</h1>
          <p className="text-muted-foreground">
            Homeowner registrations across every builder. Clean up test and duplicate records.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Registrations ({rows.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search name, email, address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={includeInactive}
                  onCheckedChange={(v) => setIncludeInactive(v === true)}
                />
                Include inactive
              </label>
              {selected.size > 0 && (
                <Button variant="destructive" size="sm" onClick={onBulkSoftDelete}>
                  Deactivate {selected.size} selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground py-6 text-center">Loading records…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Builder</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className={!r.isActive ? 'opacity-60' : undefined}>
                      <TableCell>
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{label(r)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.email}</TableCell>
                      <TableCell>{r.builderOrgName}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.installedItems}</TableCell>
                      <TableCell>
                        <Badge variant={r.isActive ? 'default' : 'secondary'}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        {r.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => onSoftDelete(r)}>
                            Deactivate
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onAnonymise(r)}>
                          Anonymise
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => onHardDelete(r)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No registrations found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPortalShell>
  );
};

const label = (r: RegistrationRecord) =>
  [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email || r.id.slice(0, 8);

export default AdminRecords;
