import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AdminPortalShell from './AdminPortalShell';
import { useAnalyticsSummaryQuery, useBuilderLeagueQuery } from '@/store/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const SEGMENTS = [
  { key: 'builders', label: 'Builders' },
  { key: 'merchants', label: 'Merchants' },
  { key: 'trades', label: 'Trades' },
  { key: 'consumers', label: 'Homeowners' },
] as const;

const AdminAnalytics = () => {
  const { data: summary, isLoading } = useAnalyticsSummaryQuery();
  const { data: league } = useBuilderLeagueQuery();

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
          </>
        )}
      </div>
    </AdminPortalShell>
  );
};

export default AdminAnalytics;
