import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Clock, CheckCircle, Loader2, Plus, UserCheck, CircleDot } from "lucide-react";
import Header from "@/components/Header";
import { useGetBuilderQueriesQuery } from "@/store/api";
import type { BuilderQuery, QueryStatus } from "@/store/api/query";

// ── Types ──

interface OrderItemApi {
  id: string;
  productName?: string;
  sku?: string;
  brand?: string;
  order?: {
    id: string;
    property?: string;
    createdAt?: string;
    customerSourceMap?: {
      customer?: { name?: string; email?: string; contact?: string };
      source?: { name?: string; email?: string };
    };
  };
}

type BuilderQueryApi = Omit<BuilderQuery, "orderItem"> & { orderItem?: OrderItemApi };

// ── Helpers ──

type TabKey = "pending" | "assigned" | "completed" | "done";

function getTabForStatus(statusName?: string): TabKey {
  const upper = (statusName ?? "").toUpperCase().replace(/\s+/g, "_");
  switch (upper) {
    case "CREATED":
    case "REVIEW":
    case "INPROGRESS":
    case "IN_PROGRESS":
      return "pending";
    case "ASSIGNED":
    case "ASSINGED":
    case "ASSIGNED_TO_VENDOR":
    case "AWAITING_VENDOR_ACTION":
      return "assigned";
    case "COMPLETED":
      return "completed";
    case "DONE":
      return "done";
    default:
      return "pending";
  }
}

function transformQuery(raw: BuilderQueryApi) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAny = raw as any;
  const customerName =
    raw.orderItem?.order?.customerSourceMap?.customer?.name ??
    raw.orderItem?.order?.customerSourceMap?.source?.name ??
    rawAny?.customerName ??
    "N/A";
  const customerEmail =
    raw.orderItem?.order?.customerSourceMap?.customer?.email ??
    raw.orderItem?.order?.customerSourceMap?.source?.email ??
    rawAny?.customerEmail ??
    "N/A";
  const projectName = raw.orderItem?.order?.property ?? "N/A";
  const createdAt = raw.orderItem?.order?.createdAt ?? raw.createdAt ?? new Date().toISOString();
  const title = raw.title ?? raw.orderItem?.productName ?? "Untitled Query";
  const description = raw.description ?? "No description provided.";
  const statusObj: QueryStatus =
    raw.status && typeof raw.status === "object"
      ? raw.status
      : { id: "", name: "UNKNOWN", module: "QUERY" };

  return {
    id: raw.id,
    subject: title,
    message: description,
    status: statusObj,
    created_at: createdAt,
    updated_at: raw.updatedAt ?? createdAt,
    priorityLevel: raw.priorityLevel ?? "N/A",
    dueDate: raw.dueDate,
    vendor: raw.vendor,
    orderItem: raw.orderItem,
    tab: getTabForStatus(statusObj.name),
    homeowner: {
      name: customerName,
      email: customerEmail,
      project: projectName,
    },
  };
}

type QueryDisplay = ReturnType<typeof transformQuery>;

function getStatusBadge(statusName: string) {
  const upper = statusName?.toUpperCase().replace(/\s+/g, "_") ?? "";
  switch (upper) {
    case "CREATED":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Created</Badge>;
    case "INPROGRESS":
    case "IN_PROGRESS":
      return <Badge variant="default"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
    case "REVIEW":
      return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Review</Badge>;
    case "ASSIGNED_TO_VENDOR":
      return <Badge variant="default"><UserCheck className="w-3 h-3 mr-1" />Assigned to Vendor</Badge>;
    case "AWAITING_VENDOR_ACTION":
      return <Badge variant="outline"><CircleDot className="w-3 h-3 mr-1" />Awaiting Vendor</Badge>;
    case "COMPLETED":
      return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Vendor Complete</Badge>;
    case "DONE":
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>;
    default:
      return <Badge variant="outline">{statusName || "Unknown"}</Badge>;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ──

const QueriesManagement = () => {
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const builderId = useMemo(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.userInfo?.builderOrganization?.id) return parsed.userInfo.builderOrganization.id;
        if (parsed.builderOrganization?.id) return parsed.builderOrganization.id;
      } catch {
        // ignore
      }
    }
    return organization?.id ?? null;
  }, [organization?.id]);

  // Fetch all queries (no status filter)
  const { data: queriesData, isLoading, isFetching } = useGetBuilderQueriesQuery(
    { builderId: builderId ?? "", statusId: "-1" },
    { skip: !builderId, refetchOnMountOrArgChange: true }
  );

  const loading = isLoading || isFetching;
  const allQueries: QueryDisplay[] = useMemo(
    () => queriesData?.data?.map((q) => transformQuery(q as BuilderQueryApi)) ?? [],
    [queriesData]
  );

  // Group by tab
  const grouped = useMemo(() => {
    const groups: Record<TabKey, QueryDisplay[]> = {
      pending: [],
      assigned: [],
      completed: [],
      done: [],
    };
    for (const q of allQueries) {
      groups[q.tab].push(q);
    }
    return groups;
  }, [allQueries]);

  const tabCounts: Record<TabKey, number> = {
    pending: grouped.pending.length,
    assigned: grouped.assigned.length,
    completed: grouped.completed.length,
    done: grouped.done.length,
  };

  const QueryCard = ({ query }: { query: QueryDisplay }) => (
    <Card
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/queries/${query.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{query.subject}</CardTitle>
            <CardDescription className="mt-1">
              From: {query.homeowner.name} ({query.homeowner.email})
              <br />
              Project: {query.homeowner.project || "N/A"}
              <br />
              {query.orderItem?.productName ? (
                <>Product: {query.orderItem.productName}{query.orderItem.brand && ` (${query.orderItem.brand})`}<br /></>
              ) : (
                <>Product: General Query<br /></>
              )}
              {query.vendor && <>Vendor: {query.vendor.name}<br /></>}
              {query.priorityLevel && query.priorityLevel !== "N/A" && <>Priority: {query.priorityLevel}<br /></>}
              {query.dueDate && <>Due Date: {new Date(query.dueDate).toLocaleDateString()}<br /></>}
              Submitted: {formatDate(query.created_at)}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(query.status?.name)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="font-medium text-sm text-muted-foreground mb-2">Query Description:</h4>
        <p className="text-sm bg-muted p-3 rounded-md">{query.message}</p>
      </CardContent>
    </Card>
  );

  const QueryList = ({ queries }: { queries: QueryDisplay[] }) => {
    if (loading) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading queries...</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (queries.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No queries in this category.</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div>
        {queries.map((query) => (
          <QueryCard key={query.id} query={query} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Queries</h1>
            <p className="text-muted-foreground mt-1">Manage and respond to queries</p>
          </div>
          <Button onClick={() => navigate("/queries/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Query
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-1.5">
              Pending
              {tabCounts.pending > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs px-1.5">
                  {tabCounts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="assigned" className="gap-1.5">
              Assigned
              {tabCounts.assigned > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs px-1.5">
                  {tabCounts.assigned}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              Completed
              {tabCounts.completed > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs px-1.5">
                  {tabCounts.completed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="done" className="gap-1.5">
              Done
              {tabCounts.done > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs px-1.5">
                  {tabCounts.done}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <QueryList queries={grouped.pending} />
          </TabsContent>
          <TabsContent value="assigned">
            <QueryList queries={grouped.assigned} />
          </TabsContent>
          <TabsContent value="completed">
            <QueryList queries={grouped.completed} />
          </TabsContent>
          <TabsContent value="done">
            <QueryList queries={grouped.done} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default QueriesManagement;
