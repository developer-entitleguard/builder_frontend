import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetStatusQuery, useGetBuilderQueriesQuery } from "@/store/api/dashboard";
import Header from "@/components/Header";

interface QueryCardData {
  id: string;
  title: string;
  description: string;
  statusName: string;
  customerName: string;
  customerEmail: string;
  projectName: string | null;
  createdAt: string;
}

const QueriesManagement = () => {
  const { toast } = useToast();
  const [selectedStatusId, setSelectedStatusId] = useState<string>("");

  // Fetch statuses for QUERY module
  const { data: statusData, isLoading: isLoadingStatuses } = useGetStatusQuery(
    { module: "QUERY" }
  );

  const statuses = statusData?.data || [];

  // Fetch builder queries based on selected status (only when a status is selected)
  const {
    data: builderQueriesData,
    isLoading: isLoadingQueries,
    error: queriesError,
  } = useGetBuilderQueriesQuery(
    {
      builderId: "11f2ee81-a1f3-4f88-bb98-a5e2a1e22611",
      statusId: selectedStatusId,
    },
    { skip: !selectedStatusId }
  );

  useEffect(() => {
    if (queriesError) {
      toast({
        title: "Error fetching queries",
        description: "Failed to load queries. Please try again.",
        variant: "destructive",
      });
    }
  }, [queriesError, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (statusName: string) => {
    return (
      <Badge variant="outline">
        <Clock className="w-3 h-3 mr-1" />
        {statusName}
      </Badge>
    );
  };

  const queries: QueryCardData[] = useMemo(() => {
    if (!builderQueriesData?.data) return [];

    return builderQueriesData.data.map((item) => {
      const customer =
        item.orderItem?.order?.customerSourceMap?.customer || null;
      const order = item.orderItem?.order || null;

      return {
        id: item.id as string,
        title: (item.title as string) ?? "Untitled Query",
        description: (item.description as string) ?? "",
        statusName: (item.status?.name as string) ?? "",
        customerName: (customer?.name as string) ?? "Unknown Customer",
        customerEmail: (customer?.email as string) ?? "",
        projectName: (order?.property as string) ?? null,
        createdAt: (order?.createdAt as string) ?? "",
      };
    });
  }, [builderQueriesData]);

  const QueryCard = ({ query }: { query: QueryCardData }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{query.title}</CardTitle>
            <CardDescription className="mt-1">
              From: {query.customerName} ({query.customerEmail})
              <br />
              Project: {query.projectName || 'N/A'}
              <br />
              Submitted: {formatDate(query.createdAt)}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(query.statusName)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Query Message:</h4>
            <p className="text-sm bg-muted p-3 rounded-md">{query.description}</p>
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
          <p className="text-muted-foreground mt-1">View homeowner queries by status</p>
        </div>

        <Tabs defaultValue="open" className="space-y-6">
          {/* Status filter dropdown fed from /api/status/bymodule?module=QUERY */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select
                value={selectedStatusId}
                onValueChange={(value) => {
                  setSelectedStatusId(value);
                }}
              >
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {isLoadingStatuses ? (
                    <SelectItem value="loading" disabled>Loading statuses...</SelectItem>
                  ) : (
                    statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="open">
            {isLoadingQueries ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading queries...</p>
                </CardContent>
              </Card>
            ) : queries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No queries found for this status.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {queries.map((query) => (
                  <QueryCard key={query.id} query={query} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
};

export default QueriesManagement;