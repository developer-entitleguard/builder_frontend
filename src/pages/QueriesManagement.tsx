import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import Header from "@/components/Header";

interface Query {
  id: string;
  subject: string;
  message: string;
  response: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  homeowner_registrations: {
    customer_name: string;
    customer_email: string;
    project_name: string;
  };
}

const QueriesManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [response, setResponse] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQueries();
    }
  }, [user]);

  const fetchQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('homeowner_queries')
        .select(`
          *,
          homeowner_registrations (
            customer_name,
            customer_email,
            project_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching queries",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
      fetchQueries();
    } catch (error: any) {
      toast({
        title: "Error sending response",
        description: error.message,
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
    switch (status) {
      case 'open':
        return <Badge variant="destructive"><Clock className="w-3 h-3 mr-1" />Open</Badge>;
      case 'responded':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Responded</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openQueries = queries.filter(q => q.status === 'open');
  const respondedQueries = queries.filter(q => q.status === 'responded');
  const closedQueries = queries.filter(q => q.status === 'closed');

  const QueryCard = ({ query }: { query: Query }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{query.subject}</CardTitle>
            <CardDescription className="mt-1">
              From: {query.homeowner_registrations.customer_name} ({query.homeowner_registrations.customer_email})
              <br />
              Project: {query.homeowner_registrations.project_name || 'N/A'}
              <br />
              Submitted: {formatDate(query.created_at)}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(query.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openResponseDialog(query)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {query.response ? 'View/Edit Response' : 'Respond'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Query Message:</h4>
            <p className="text-sm bg-muted p-3 rounded-md">{query.message}</p>
          </div>
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
          <TabsList>
            <TabsTrigger value="open" className="relative">
              Open Queries
              {openQueries.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {openQueries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="responded">
              Responded ({respondedQueries.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({closedQueries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            {openQueries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No open queries at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {openQueries.map((query) => (
                  <QueryCard key={query.id} query={query} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="responded">
            {respondedQueries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No responded queries yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {respondedQueries.map((query) => (
                  <QueryCard key={query.id} query={query} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed">
            {closedQueries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No closed queries yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {closedQueries.map((query) => (
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
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="font-medium">{selectedQuery.subject}</p>
                    <p className="text-sm mt-1">{selectedQuery.message}</p>
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