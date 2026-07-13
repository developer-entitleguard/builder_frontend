import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AdminPortalShell from './AdminPortalShell';
import { useAnalyticsSummaryQuery, useBuilderLeagueQuery, useAdoptionQuery, useUsageQuery, type AdoptionRow } from '@/store/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const flag = (v: boolean) =>
  v ? <span className="text-primary font-semibold">✓</span> : <span className="text-muted-foreground">—</span>;

const downloadAdoptionCsv = (rows: AdoptionRow[]) => {
  const header = ['Builder', 'Users', 'Vendors', 'Suppliers', 'Project', 'Handover', 'Stuck'];
  const body = rows.map((r) => [
    r.builderName, r.hasUsers, r.hasVendors, r.hasSuppliers, r.hasProject, r.hasHandover, r.stuckSinceSignup,
  ].join(','));
  const csv = [header.join(','), ...body].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'builder-adoption.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const SEGMENTS = [
  { key: 'builders', label: 'Builders' },
  { key: 'merchants', label: 'Merchants' },
  { key: 'trades', label: 'Trades' },
  { key: 'consumers', label: 'Homeowners' },
] as const;

const AdminAnalytics = () => {
  const { data: summary, isLoading } = useAnalyticsSummaryQuery();
  const { data: league } = useBuilderLeagueQuery();
  const { data: adoption } = useAdoptionQuery();
  const { data: usage } = useUsageQuery();

  const segmentChart = summary
    ? SEGMENTS.map((s) => ({
        name: s.label,
        active: summary[s.key].active,
        inactive: summary[s.key].total - summary[s.key].active,
      }))
    : [];

  const headline = summary
    ? [
        { label: 'Homes handed over', value: summary.homesHandedOver },
        { label: 'Entitlements issued', value: summary.entitlementsIssued },
        { label: 'Queries raised', value: summary.queriesRaised },
        { label: 'Queries resolved', value: summary.queriesResolved },
      ]
    : [];

  return (
    <AdminPortalShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Platform-wide activity across every account segment.</p>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading analytics…</p>}

        {summary && (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {SEGMENTS.map((s) => (
                <Card key={s.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{summary[s.key].total}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary[s.key].active} active
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {headline.map((h) => (
                <Card key={h.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{h.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{h.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Accounts by segment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={segmentChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="active" stackId="a" fill="hsl(var(--primary))" name="Active" />
                      <Bar dataKey="inactive" stackId="a" fill="hsl(var(--muted-foreground))" name="Inactive" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Builder league</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Builder</TableHead>
                      <TableHead className="text-right">Homeowners seeded</TableHead>
                      <TableHead className="text-right">Homes handed over</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(league ?? []).map((row) => (
                      <TableRow key={row.builderId}>
                        <TableCell className="font-medium">{row.builderName}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.homeownersSeeded}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.homesHandedOver}</TableCell>
                      </TableRow>
                    ))}
                    {(league ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          No builders yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Onboarding adoption</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Who has finished setup and who is stuck.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadAdoptionCsv(adoption ?? [])}>
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Builder</TableHead>
                      <TableHead className="text-center">Users</TableHead>
                      <TableHead className="text-center">Vendors</TableHead>
                      <TableHead className="text-center">Suppliers</TableHead>
                      <TableHead className="text-center">Project</TableHead>
                      <TableHead className="text-center">Handover</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(adoption ?? []).map((r) => (
                      <TableRow key={r.builderId}>
                        <TableCell className="font-medium">{r.builderName}</TableCell>
                        <TableCell className="text-center">{flag(r.hasUsers)}</TableCell>
                        <TableCell className="text-center">{flag(r.hasVendors)}</TableCell>
                        <TableCell className="text-center">{flag(r.hasSuppliers)}</TableCell>
                        <TableCell className="text-center">{flag(r.hasProject)}</TableCell>
                        <TableCell className="text-center">{flag(r.hasHandover)}</TableCell>
                        <TableCell className="text-right">
                          {r.stuckSinceSignup
                            ? <Badge variant="destructive">Stuck</Badge>
                            : <Badge variant="secondary">Active</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(adoption ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          No builders yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {usage && (
              <Card>
                <CardHeader>
                  <CardTitle>Usage (last 30 days)</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{usage.note}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                    <div>
                      <div className="text-3xl font-bold">{usage.activeAccountsLast30d}</div>
                      <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{usage.eventsLast30d}</div>
                      <p className="text-xs text-muted-foreground mt-1">Audited events</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{usage.registrationsCreatedLast30d}</div>
                      <p className="text-xs text-muted-foreground mt-1">Registrations created</p>
                    </div>
                  </div>
                  {usage.trackedActions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {usage.trackedActions.map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminPortalShell>
  );
};

export default AdminAnalytics;
