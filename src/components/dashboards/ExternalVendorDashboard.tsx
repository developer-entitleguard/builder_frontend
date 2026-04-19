import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo } from "lucide-react";
import { useGetMyAssignedQueriesQuery } from "@/store/api/vendorSchedule";

export const ExternalVendorDashboard = () => {
  const { data, isLoading } = useGetMyAssignedQueriesQuery();
  const queries = data?.data ?? [];

  return (
    <div>
      <Header />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">My queue</h1>
          <p className="text-sm text-muted-foreground">Assigned work for you to action.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              {isLoading ? "Loading…" : `${queries.length} assignments`}
            </CardTitle>
            <CardDescription>
              Open <Link to="/my-assignments" className="underline">My assignments</Link> to update status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/my-assignments">Open assignments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExternalVendorDashboard;
