import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useGetInternalVendorDashboardQuery } from "@/store/api/roleDashboards";
import { CalendarDays, ListTodo } from "lucide-react";

export const InternalVendorDashboard = () => {
  const { data, isLoading } = useGetInternalVendorDashboardQuery();
  const stats = data?.data;

  return (
    <div>
      <Header />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome{stats?.vendorName ? `, ${stats.vendorName}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Snapshot of your work.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="Open queries" value={stats?.openQueries ?? 0} loading={isLoading} icon={<ListTodo className="h-4 w-4" />} />
          <StatCard label="Slots this week" value={stats?.upcomingSlots ?? 0} loading={isLoading} icon={<CalendarDays className="h-4 w-4" />} />
          <StatCard label="Booked this week" value={stats?.upcomingBooked ?? 0} loading={isLoading} icon={<CalendarDays className="h-4 w-4" />} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Manage your schedule and update assigned work.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild>
              <Link to="/my-schedule">My schedule</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/my-assignments">My assignments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, loading, icon }: { label: string; value: number; loading: boolean; icon: React.ReactNode }) => (
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

export default InternalVendorDashboard;
