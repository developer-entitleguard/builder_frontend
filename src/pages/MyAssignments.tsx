import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyAssignedQueriesQuery } from "@/store/api/vendorSchedule";
import { ArrowRight } from "lucide-react";

const MyAssignments = () => {
  const { data: queriesResp, isLoading } = useGetMyAssignedQueriesQuery();
  const queries = queriesResp?.data ?? [];

  return (
    <div>
      <Header />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>My assignments ({isLoading ? "…" : queries.length})</CardTitle>
            <CardDescription>
              Open queries assigned to you. Tap any row to see the full case, upload photos and update status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <Skeleton className="h-24" />}
            {!isLoading && queries.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing assigned right now.</p>
            )}
            {queries.map((q) => (
              <Link
                key={q.id}
                to={`/my-assignments/${q.id}`}
                className="flex justify-between items-start gap-3 border rounded-md p-3 hover:border-primary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{q.title}</p>
                    {q.priorityLevel && (
                      <Badge variant="outline" className="text-[10px]">
                        {q.priorityLevel}
                      </Badge>
                    )}
                    {q.status?.name && (
                      <Badge variant="secondary" className="text-[10px]">
                        {q.status.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {q.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {q.customerName ?? "—"} · {q.customerAddress ?? ""} {q.customerCity ?? ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {q.dueDate && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Due {q.dueDate}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyAssignments;
