import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCustomerSupportDashboardQuery } from "@/store/api/roleDashboards";
import { useOrganization } from "@/hooks/useOrganization";
import { ShieldAlert, Inbox, CalendarClock, Headphones } from "lucide-react";

export const CustomerSupportDashboard = () => {
  const { effectiveOrganization } = useOrganization();
  const builderId = effectiveOrganization?.id;
  const { data, isLoading } = useGetCustomerSupportDashboardQuery(
    { builderId: builderId ?? "" },
    { skip: !builderId },
  );
  const stats = data?.data;

  return (
    <div>
      <Header />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Support</h1>
          <p className="text-sm text-muted-foreground">
            Triage queries, monitor warranty deadlines, and assign internal vendors.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Open queries" value={stats?.openQueries ?? 0} icon={<Inbox className="h-4 w-4" />} loading={isLoading} />
          <StatCard label="Internal vendors" value={stats?.internalVendorCount ?? 0} icon={<Headphones className="h-4 w-4" />} loading={isLoading} />
          <StatCard label="Slots free today" value={stats?.availableSlotsToday ?? 0} icon={<CalendarClock className="h-4 w-4" />} loading={isLoading} />
          <StatCard label="Warranty alerts" value={stats?.warrantyExpiringSoon.length ?? 0} icon={<ShieldAlert className="h-4 w-4" />} loading={isLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Warranty expiring soon</CardTitle>
            <CardDescription>
              House-level warranties ending in the next 30 days. Reach out before they lapse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-16" />}
            {!isLoading && (stats?.warrantyExpiringSoon ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No warranties expiring soon.</p>
            )}
            {(stats?.warrantyExpiringSoon ?? []).map((row) => (
              <Link
                key={row.registrationId}
                to={`/registration/${row.registrationId}`}
                className="border rounded-md p-2 flex items-center justify-between hover:border-primary"
              >
                <div>
                  <p className="font-medium text-sm">{row.customerName}</p>
                  <p className="text-xs text-muted-foreground">{row.address ?? "—"}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px]">
                    Ends {row.warrantyEndsAt}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.daysRemaining} day(s) left
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading: boolean }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2 text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{value}</p>}
    </CardContent>
  </Card>
);

export default CustomerSupportDashboard;
