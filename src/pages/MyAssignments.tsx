import { useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetMyAssignedQueriesQuery, type MyAssignedQuery } from "@/store/api/vendorSchedule";
import { ArrowRight } from "lucide-react";

// Completed tab is capped at the most-recent items so it doesn't grow forever.
const COMPLETED_LIMIT = 20;

const AssignmentRow = ({ q }: { q: MyAssignedQuery }) => (
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
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{q.description}</p>
      <p className="text-xs text-muted-foreground mt-2">
        {q.customerName ?? "—"} · {q.customerAddress ?? ""} {q.customerCity ?? ""}
      </p>
    </div>
    <div className="flex flex-col items-end gap-2 shrink-0">
      {q.dueDate && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">Due {q.dueDate}</span>
      )}
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </div>
  </Link>
);

const MyAssignments = () => {
  const { data: queriesResp, isLoading } = useGetMyAssignedQueriesQuery();
  const queries = useMemo(() => queriesResp?.data ?? [], [queriesResp]);

  // Split by the vendor's own job completion, NOT the query status.
  const { pending, completed } = useMemo(() => {
    const pendingRows: MyAssignedQuery[] = [];
    const completedRows: MyAssignedQuery[] = [];
    for (const q of queries) {
      (q.completed ? completedRows : pendingRows).push(q);
    }
    // Completed tab: most-recent first, capped to COMPLETED_LIMIT.
    completedRows.sort((a, b) => {
      const ta = a.completedAt ? Date.parse(a.completedAt) : 0;
      const tb = b.completedAt ? Date.parse(b.completedAt) : 0;
      return tb - ta;
    });
    return { pending: pendingRows, completed: completedRows.slice(0, COMPLETED_LIMIT) };
  }, [queries]);

  return (
    <div>
      <Header />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>My assignments</CardTitle>
            <CardDescription>
              Queries assigned to you. Tap any row to see the full case, upload photos and update status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <Tabs defaultValue="pending">
                <TabsList className="mb-4">
                  <TabsTrigger value="pending" className="gap-1.5">
                    Pending
                    {pending.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs px-1.5">
                        {pending.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="gap-1.5">
                    Completed
                    {completed.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs px-1.5">
                        {completed.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-3">
                  {pending.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing pending right now.</p>
                  ) : (
                    pending.map((q) => <AssignmentRow key={q.id} q={q} />)
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-3">
                  {completed.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No completed assignments yet.</p>
                  ) : (
                    completed.map((q) => <AssignmentRow key={q.id} q={q} />)
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyAssignments;
