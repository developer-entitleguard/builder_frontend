import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { useGetStatusByModuleQuery } from "@/lib/api/services/status";
import { useGetBuilderQueriesQuery, type BuilderQuery } from "@/lib/api/services/query";

// Transform API query to component format
const transformQuery = (query: BuilderQuery) => {
  const customerName = query.orderItem?.order?.customerSourceMap?.customer?.name || 
    query.orderItem?.order?.customerSourceMap?.source?.name || 'N/A';
  
  const customerEmail = query.orderItem?.order?.customerSourceMap?.customer?.email || 
    query.orderItem?.order?.customerSourceMap?.source?.email || 'N/A';
  
  const projectName = query.orderItem?.order?.property || 'N/A';
  const createdAt = query.orderItem?.order?.createdAt || new Date().toISOString();

  return {
    id: query.id,
    subject: query.title,
    message: query.description,
    response: null, // API doesn't return response in this structure
    status: query.status?.name || 'UNKNOWN',
    statusId: query.status?.id,
    created_at: createdAt,
    updated_at: query.updatedAt || createdAt,
    responded_at: null,
    priorityLevel: query.priorityLevel,
    dueDate: query.dueDate,
    vendor: query.vendor,
    queryFileMaps: query.queryFileMaps || [],
    orderItem: query.orderItem,
    homeowner_registrations: {
      customer_name: customerName,
      customer_email: customerEmail,
      project_name: projectName,
    },
  };
};

interface Query {
  id: string;
  subject: string;
  message: string;
  response: string | null;
  status: string;
  statusId?: string;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  priorityLevel?: string;
  dueDate?: string;
  vendor?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  queryFileMaps?: Array<{
    id: string;
    type: string;
    files?: {
      id: string;
      name: string;
      type: string;
      fileType: string;
      filePath: string;
    };
  }>;
  orderItem?: {
    id: string;
    productName?: string;
    sku?: string;
    brand?: string;
    order?: {
      id: string;
      property?: string;
      createdAt?: string;
      customerSourceMap?: {
        customer?: {
          name: string;
          email: string;
        };
        source?: {
          name: string;
          email: string;
        };
      };
    };
  };
  homeowner_registrations: {
    customer_name: string;
    customer_email: string;
    project_name: string;
  };
}

const QueriesManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [response, setResponse] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string>("");

  // Map status name to route
  const getRouteByStatus = (statusName: string): string => {
    const statusUpper = statusName?.toUpperCase() || '';
    switch (statusUpper) {
      case 'CREATED':
        return '/pendingQueries';
      case 'IN PROGRESS':
      case 'INPROGRESS':
        return '/pendingQueries';
      case 'ASSIGNED TO VENDOR':
        return '/awaitingAction';
      case 'COMPLETED':
        return '/pendingQueries';
      case 'DONE':
        return '/queriesComplete';
      default:
        return '/pendingQueries'; // Default route
    }
  };

  const handleCardClick = (query: Query) => {
    const route = getRouteByStatus(query.status);
    navigate(route, { state: { query } });
  };

  const builderId = user && 'builderOrganization' in user 
    ? user.builderOrganization.id 
    : null;

  // Fetch statuses for QUERY module
  const { data: statusData, isLoading: isLoadingStatuses } = useGetStatusByModuleQuery({ module: "QUERY" });
  const statuses = statusData?.data || [];

  // Fetch queries from API only when a specific status is selected
  const { data: queriesData, isLoading: loading, refetch } = useGetBuilderQueriesQuery(
    { 
      builderId: builderId || "",
      statusId: selectedStatusId || undefined,
    },
    { 
      skip: !builderId || !selectedStatusId,
      refetchOnMountOrArgChange: true,
    }
  );

  // Transform queries data - only show queries when a status is selected
  const queries: Query[] = selectedStatusId 
    ? (queriesData?.data?.map(transformQuery) || [])
    : [];

  const handleRespond = async () => {
    if (!selectedQuery || !response.trim()) return;

    try {
      const { error } = await supabase
        .from('homeowner_queries')
        .update({
          response: response.trim(),
          status: 'responded',
          responded_at: new Date().toISOString()
        })
        .eq('id', selectedQuery.id);

      if (error) throw error;

      toast({ title: "Response sent successfully" });
      setDialogOpen(false);
      setResponse("");
      setSelectedQuery(null);
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error sending response",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const openResponseDialog = (query: Query) => {
    setSelectedQuery(query);
    setResponse(query.response || "");
    setDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status?.toUpperCase() || '';
    switch (statusUpper) {
      case 'CREATED':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Created</Badge>;
      case 'INPROGRESS':
      case 'IN_PROGRESS':
        return <Badge variant="default"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'REVIEW':
        return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Review</Badge>;
      case 'ASSIGNED':
      case 'ASSINGED':
        return <Badge variant="default">Assigned</Badge>;
      case 'ASSIGNED TO VENDOR':
        return <Badge variant="default">Assigned to Vendor</Badge>;
      case 'AWAITING VENDOR ACTION':
        return <Badge variant="outline">Awaiting Vendor</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Display all queries (already filtered by API)
  const displayQueries = queries;

  const QueryCard = ({ query }: { query: Query }) => (
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
              Project: {query.homeowner_registrations.project_name || 'N/A'}
              <br />
              {query.orderItem?.productName && (
                <>
                  Product: {query.orderItem.productName}
                  {query.orderItem.brand && ` (${query.orderItem.brand})`}
                  {query.orderItem.sku && ` - SKU: ${query.orderItem.sku}`}
                  <br />
                </>
              )}
              {query.priorityLevel && (
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
            {getStatusBadge(query.status)}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => openResponseDialog(query)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {query.response ? 'View/Edit Response' : 'Respond'}
            </Button> */}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Query Description:</h4>
            <p className="text-sm bg-muted p-3 rounded-md">{query.message}</p>
          </div>
          {/* {query.queryFileMaps && query.queryFileMaps.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Attachments:</h4>
              <div className="flex flex-wrap gap-2">
                {query.queryFileMaps.map((fileMap) => (
                  <a
                    key={fileMap.id}
                    href={fileMap.files?.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {fileMap.files?.name || 'File'}
                  </a>
                ))}
              </div>
            </div>
          )} */}
          {query.response && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Your Response {query.responded_at && `(${formatDate(query.responded_at)}):`}
              </h4>
              <p className="text-sm bg-blue-50 p-3 rounded-md border-l-4 border-blue-200">{query.response}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Homeowner Queries</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to homeowner queries</p>
        </div>

        <Tabs defaultValue="open" className="space-y-6">
          {/* Status Filter */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={selectedStatusId === "all" ? "" : selectedStatusId} onValueChange={setSelectedStatusId}>
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

          <TabsContent value="open">
            {!selectedStatusId ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Please select a status to view queries.</p>
                </CardContent>
              </Card>
            ) : displayQueries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No queries found for the selected status.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {displayQueries.map((query) => (
                  <QueryCard key={query.id} query={query} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedQuery?.response ? 'Edit Response' : 'Respond to Query'}
              </DialogTitle>
              <DialogDescription>
                {selectedQuery && (
                  <div className="mt-2 p-3 bg-muted rounded-md space-y-2">
                    <p className="font-medium">{selectedQuery.subject}</p>
                    <p className="text-sm">{selectedQuery.message}</p>
                    {selectedQuery.orderItem?.productName && (
                      <p className="text-sm text-muted-foreground">
                        Product: {selectedQuery.orderItem.productName}
                        {selectedQuery.orderItem.brand && ` (${selectedQuery.orderItem.brand})`}
                      </p>
                    )}
                    {selectedQuery.priorityLevel && (
                      <p className="text-sm text-muted-foreground">
                        Priority: {selectedQuery.priorityLevel}
                      </p>
                    )}
                    {selectedQuery.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Due Date: {new Date(selectedQuery.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response here..."
                rows={6}
                className="w-full"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRespond} disabled={!response.trim()}>
                  Send Response
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default QueriesManagement;