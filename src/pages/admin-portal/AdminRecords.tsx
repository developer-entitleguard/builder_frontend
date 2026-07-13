import { useState } from 'react';
import AdminPortalShell from './AdminPortalShell';
import {
  useGetRegistrationsQuery,
  useSoftDeleteRegistrationMutation,
  useHardDeleteRegistrationMutation,
  useAnonymiseRegistrationMutation,
  useBulkSoftDeleteMutation,
  useCustomersRecordsQuery,
  useBuildersRecordsQuery,
  useSuppliersRecordsQuery,
  useVendorsRecordsQuery,
  useDeactivateCustomerMutation,
  useDeleteCustomerMutation,
  useDeactivateBuilderMutation,
  useDeleteBuilderMutation,
  useDeactivateSupplierMutation,
  useDeleteSupplierMutation,
  useDeactivateVendorMutation,
  useDeleteVendorMutation,
  fetchDependencies,
  type RegistrationRecord,
  type LinkedParty,
  type CustomerRecord,
  type BuilderRecord,
} from '@/store/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const { data: customers, refetch: refetchCustomers } = useCustomersRecordsQuery(search);
  const { data: builders, refetch: refetchBuilders } = useBuildersRecordsQuery();
  const { data: suppliers, refetch: refetchSuppliers } = useSuppliersRecordsQuery();
  const { data: vendors, refetch: refetchVendors } = useVendorsRecordsQuery();

  const [deactivateCustomer] = useDeactivateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [deactivateBuilder] = useDeactivateBuilderMutation();
  const [deleteBuilder] = useDeleteBuilderMutation();
  const [deactivateSupplier] = useDeactivateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [deactivateVendor] = useDeactivateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();

  const rows = records ?? [];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const askReason = (action: string, name: string) =>
    window.prompt(`Reason for ${action} "${name}" (recorded in the audit log):`, '');

  const run = async (
    fn: () => Promise<{ message: string }>,
    ok: string,
    after: () => void = refetch,
  ) => {
    try {
      const res = await fn();
      toast({ title: ok, description: res.message });
      after();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'data' in e
        ? (e as { data?: { message?: string } }).data?.message
        : e instanceof Error ? e.message : 'Action failed';
      toast({ title: 'Action failed', description: String(msg), variant: 'destructive' });
    }
  };

  // ---- Customers ----
  const onDeactivateCustomer = (c: CustomerRecord) => {
    const reason = askReason('deactivating', c.name ?? c.email ?? c.id);
    if (reason == null) return;
    run(() => deactivateCustomer({ id: c.id, reason }).unwrap(), 'Customer deactivated', refetchCustomers);
  };
  const onDeleteCustomer = (c: CustomerRecord) => {
    const who = c.name ?? c.email ?? c.id;
    if (!window.confirm(
      `Permanently delete customer "${who}" and ALL related records ` +
      `(properties, orders, entitlements, queries, insurance)? This cannot be undone.`)) return;
    const reason = askReason('permanently deleting', who);
    if (reason == null) return;
    run(() => deleteCustomer({ id: c.id, reason }).unwrap(), 'Customer deleted', refetchCustomers);
  };

  // ---- Builders ----
  const onDeactivateBuilder = (b: BuilderRecord) => {
    const reason = askReason('deactivating', b.name ?? b.id);
    if (reason == null) return;
    run(() => deactivateBuilder({ id: b.id, reason }).unwrap(), 'Builder deactivated', refetchBuilders);
  };
  const onDeleteBuilder = (b: BuilderRecord) => {
    const who = b.name ?? b.id;
    if (!window.confirm(
      `Permanently delete builder "${who}" and EVERYTHING it owns ` +
      `(registrations, projects, items, vendors, staff logins, queries)? This cannot be undone.`)) return;
    const reason = askReason('permanently deleting', who);
    if (reason == null) return;
    run(() => deleteBuilder({ id: b.id, reason }).unwrap(), 'Builder deleted', refetchBuilders);
  };

  // ---- Suppliers / Vendors (deduped across builders by email/name) ----
  const onDeactivateSupplier = (p: LinkedParty) => {
    const reason = askReason('deactivating', p.name ?? p.email ?? 'supplier');
    if (reason == null) return;
    run(() => deactivateSupplier({ email: p.email, name: p.name, reason }).unwrap(),
      'Supplier deactivated', refetchSuppliers);
  };
  const onDeleteSupplier = (p: LinkedParty) => {
    const who = p.name ?? p.email ?? 'this supplier';
    if (!window.confirm(`Permanently delete supplier "${who}" across all ${p.buildersLinked} linked builder(s)? This cannot be undone.`)) return;
    const reason = askReason('permanently deleting', who);
    if (reason == null) return;
    run(() => deleteSupplier({ email: p.email, name: p.name, reason }).unwrap(),
      'Supplier deleted', refetchSuppliers);
  };
  const onDeactivateVendor = (p: LinkedParty) => {
    const reason = askReason('deactivating', p.name ?? p.email ?? 'vendor');
    if (reason == null) return;
    run(() => deactivateVendor({ email: p.email, name: p.name, reason }).unwrap(),
      'Vendor deactivated', refetchVendors);
  };
  const onDeleteVendor = (p: LinkedParty) => {
    const who = p.name ?? p.email ?? 'this vendor';
    if (!window.confirm(`Permanently delete vendor "${who}" across all ${p.buildersLinked} linked builder(s), including their schedules? This cannot be undone.`)) return;
    const reason = askReason('permanently deleting', who);
    if (reason == null) return;
    run(() => deleteVendor({ email: p.email, name: p.name, reason }).unwrap(),
      'Vendor deleted', refetchVendors);
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Records</h1>
          <p className="text-muted-foreground">
            Homeowner registrations across every builder. Clean up test and duplicate records.
          </p>
        </div>

        <Tabs defaultValue="registrations">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="builders">Builders</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
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
                        <TableHead>Address</TableHead>
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
                          <TableCell className="font-medium max-w-[160px] truncate">{label(r)}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.email}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.address}</TableCell>
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
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                            No registrations found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader><CardTitle>Customers ({(customers ?? []).length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Properties</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customers ?? []).map((c) => (
                      <TableRow key={c.id} className={c.isActive === false ? 'opacity-60' : undefined}>
                        <TableCell className="font-medium max-w-[180px] truncate">{c.name ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.email}</TableCell>
                        <TableCell>
                          <Badge variant={c.isRegistered ? 'default' : 'secondary'}>
                            {c.isRegistered ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{c.propertiesAdded}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.ordersUploaded}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDate(c.createdAt)}</TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          {c.isActive !== false && (
                            <Button variant="ghost" size="sm" onClick={() => onDeactivateCustomer(c)}>
                              Deactivate
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDeleteCustomer(c)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(customers ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No customers yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="builders">
            <Card>
              <CardHeader><CardTitle>Builders ({(builders ?? []).length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Builder</TableHead>
                      <TableHead className="text-right">Properties</TableHead>
                      <TableHead className="text-right">Registrations</TableHead>
                      <TableHead className="text-right">Handed over</TableHead>
                      <TableHead className="text-right">Support tickets</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(builders ?? []).map((b) => (
                      <TableRow key={b.id} className={!b.isActive ? 'opacity-60' : undefined}>
                        <TableCell className="font-medium max-w-[220px] truncate">{b.name ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.properties}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.registrations}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.handedOver}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.supportTickets}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDate(b.createdAt)}</TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          {b.isActive !== false && (
                            <Button variant="ghost" size="sm" onClick={() => onDeactivateBuilder(b)}>
                              Deactivate
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDeleteBuilder(b)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(builders ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No builders yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <LinkedPartyTable
              title="Suppliers"
              counterpart="merchant"
              rows={suppliers ?? []}
              onDeactivate={onDeactivateSupplier}
              onDelete={onDeleteSupplier}
            />
          </TabsContent>

          <TabsContent value="vendors">
            <LinkedPartyTable
              title="Vendors"
              counterpart="trade"
              rows={vendors ?? []}
              onDeactivate={onDeactivateVendor}
              onDelete={onDeleteVendor}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalShell>
  );
};

const label = (r: RegistrationRecord) =>
  [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email || r.id.slice(0, 8);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

/**
 * Suppliers and Vendors share the same deduped-across-builders shape. A builder's
 * supplier is a merchant on EntitleGuard; a builder's vendor is a trade. When a
 * platform org matches (by email or ABN), we show that org's account.
 */
const LinkedPartyTable = ({
  title, counterpart, rows, onDeactivate, onDelete,
}: {
  title: string;
  counterpart: 'merchant' | 'trade';
  rows: LinkedParty[];
  onDeactivate: (p: LinkedParty) => void;
  onDelete: (p: LinkedParty) => void;
}) => {
  const cap = counterpart === 'merchant' ? 'Merchant' : 'Trade';
  const onPlatform = rows.filter((p) => p.inEntitleguard).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} across builders ({rows.length})</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          A builder's {counterpart === 'merchant' ? 'supplier' : 'vendor'} is a{' '}
          <span className="font-medium">{counterpart}</span> on EntitleGuard. Deduped by email;{' '}
          {onPlatform} of {rows.length} match a {counterpart} account on the platform (by email or ABN).
          Actions apply to every matching record across all linked builders.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>EntitleGuard {counterpart}</TableHead>
              <TableHead className="text-right">Builders linked</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p, i) => (
              <TableRow key={`${p.email ?? p.name ?? i}`}>
                <TableCell className="font-medium max-w-[200px] truncate">{p.name ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground max-w-[220px] truncate">{p.email ?? '—'}</TableCell>
                <TableCell className="max-w-[220px]">
                  {p.inEntitleguard ? (
                    <div className="flex flex-col">
                      <Badge variant="default" className="w-fit">{cap} account</Badge>
                      {p.platformOrgName && (
                        <span className="text-xs text-muted-foreground mt-1 truncate">{p.platformOrgName}</span>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">Not a {counterpart}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.buildersLinked}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDate(p.firstAdded)}</TableCell>
                <TableCell className="text-right space-x-1 whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => onDeactivate(p)}>Deactivate</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(p)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">None yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminRecords;
