import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, CheckCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { useGetStatusQuery, useGetBuilderQueriesQuery, useLazyGetQueryByIdQuery } from "@/store/api";
import type { BuilderQuery, QueryStatus } from "@/store/api/query";

// API shape for orderItem (nested customer/order)
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

function transformQuery(raw: BuilderQueryApi) {
  const customerName =
    raw.orderItem?.order?.customerSourceMap?.customer?.name ??
    raw.orderItem?.order?.customerSourceMap?.source?.name ??
    "N/A";
  const customerEmail =
    raw.orderItem?.order?.customerSourceMap?.customer?.email ??
    raw.orderItem?.order?.customerSourceMap?.source?.email ??
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
    response: null,
    status: statusObj,
    statusId: statusObj.id,
    created_at: createdAt,
    updated_at: raw.updatedAt ?? createdAt,
    responded_at: null,
    priorityLevel: raw.priorityLevel ?? "N/A",
    dueDate: raw.dueDate,
    vendor: raw.vendor,
    queryFileMaps: raw.queryFileMaps ?? [],
    orderItem: raw.orderItem,
    homeowner_registrations: {
      customer_name: customerName,
      customer_email: customerEmail,
      project_name: projectName,
    },
  };
}

type QueryDisplay = ReturnType<typeof transformQuery>;

function getStatusName(status: QueryStatus | undefined): string {
  return status?.name ?? "UNKNOWN";
}

function getRouteByStatus(statusName: string): string {
  const upper = statusName?.toUpperCase().replace(/\s+/g, "_") ?? "";
  switch (upper) {
    case "CREATED":
    case "REVIEW":
    case "INPROGRESS":
    case "IN_PROGRESS":
      return "/pendingQueries";
    case "ASSIGNED":
    case "ASSINGED":
    case "ASSIGNED_TO_VENDOR":
    case "AWAITING_VENDOR_ACTION":
      return "/awaitingAction";
    case "COMPLETED":
    case "DONE":
      return "/queriesComplete";
    default:
      return "/pendingQueries";
  }
}

function getStatusBadge(statusName: string) {
  const upper = statusName?.toUpperCase() ?? "";
  switch (upper) {
    case "CREATED":
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Created
        </Badge>
      );
    case "INPROGRESS":
    case "IN_PROGRESS":
      return (
        <Badge variant="default">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      );
    case "REVIEW":
      return (
        <Badge variant="outline">
          <CheckCircle className="w-3 h-3 mr-1" />
          Review
        </Badge>
      );
    case "ASSIGNED":
    case "ASSINGED":
      return <Badge variant="default">Assigned</Badge>;
    case "ASSIGNED_TO_VENDOR":
      return <Badge variant="default">Assigned to Vendor</Badge>;
    case "AWAITING_VENDOR_ACTION":
      return <Badge variant="outline">Awaiting Vendor</Badge>;
    case "COMPLETED":
    case "DONE":
      return (
        <Badge variant="default">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
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

const QueriesManagement = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedStatusId, setSelectedStatusId] = useState<string>("-1");
  const [triggerGetQueryById] = useLazyGetQueryByIdQuery();

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

  const { data: statusData, isLoading: isLoadingStatuses } = useGetStatusQuery(
    { module: "QUERY" },
    { skip: !builderId }
  );
  const statuses = statusData?.data ?? [];

  const { data: queriesData, isLoading, isFetching, refetch } = useGetBuilderQueriesQuery(
    {
      builderId: builderId ?? "",
      statusId: selectedStatusId,
    },
    {
      skip: !builderId,
      refetchOnMountOrArgChange: true,
    }
  );

  const loading = isLoading || isFetching;
  const queries: QueryDisplay[] = queriesData?.data?.map((q) => transformQuery(q as BuilderQueryApi)) ?? [];

  const handleCardClick = async (query: QueryDisplay) => {
    try {
      const result = await triggerGetQueryById({ id: query.id }).unwrap();
      const payload = result?.data as BuilderQueryApi;
      const statusName = getStatusName(payload?.status);
      const route = getRouteByStatus(statusName);
      navigate(route, { state: { query: payload ?? query } });
    } catch {
      toast({
        title: "Error fetching query",
        description: "Unable to load query details",
        variant: "destructive",
      });
      const statusName = getStatusName(query.status);
      const route = getRouteByStatus(statusName);
      navigate(route, { state: { query } });
    }
  };

  const QueryCard = ({ query }: { query: QueryDisplay }) => (
    <Card
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleCardClick(query)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{query.subject}</CardTitle>
            <CardDescription className="mt-1">
              From: {query.homeowner_registrations.customer_name} ({query.homeowner_registrations.customer_email})
              <br />
              Project: {query.homeowner_registrations.project_name || "N/A"}
              <br />
              {query.orderItem?.productName && (
                <>
                  Product: {query.orderItem.productName}
                  {query.orderItem.brand && ` (${query.orderItem.brand})`}
                  {query.orderItem.sku && ` - SKU: ${query.orderItem.sku}`}
                  <br />
                </>
              )}
              {query.priorityLevel && query.priorityLevel !== "N/A" && (
                <>
                  Priority: {query.priorityLevel}
                  <br />
                </>
              )}
              {query.dueDate && (
                <>
                  Due Date: {new Date(query.dueDate).toLocaleDateString()}
                  <br />
                </>
              )}
              Submitted: {formatDate(query.created_at)}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(getStatusName(query.status))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Query Description:</h4>
            <p className="text-sm bg-muted p-3 rounded-md">{query.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Homeowner Queries</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to homeowner queries</p>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingStatuses ? (
                <SelectItem value="loading" disabled>
                  Loading statuses...
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="-1">All</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading queries...</p>
              </div>
            </CardContent>
          </Card>
        ) : queries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No queries found for the selected status.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            {queries.map((query) => (
              <QueryCard key={query.id} query={query} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default QueriesManagement;
