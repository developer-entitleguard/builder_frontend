import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Eye, EyeOff } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  status?: string | null;
}

const SuperAdminImpersonation = () => {
  const { impersonatedOrganization, setImpersonatedOrganization, isSuperAdmin } = useOrganization();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("builder_organizations")
        .select("id, name, address, contact_email, status")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setImpersonatedOrganization(org as any);
      toast({
        title: "Impersonation Active",
        description: `You are now viewing as "${org.name}"`,
      });
    }
  };

  const handleStopImpersonation = () => {
    setImpersonatedOrganization(null);
    toast({
      title: "Impersonation Ended",
      description: "You are back to superadmin view",
    });
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Organization Impersonation
          </CardTitle>
          <CardDescription>
            View and access the platform as if you were a member of any organization.
            This allows you to troubleshoot issues and assist users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {impersonatedOrganization ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Currently impersonating:</p>
                    <p className="text-lg font-bold text-primary">
                      {impersonatedOrganization.name}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleStopImpersonation}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Stop Impersonation
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                While impersonating, all data views will show data from this organization.
                Navigate to Dashboard, Projects, or other pages to see their data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Select Organization to Impersonate</label>
                <Select onValueChange={handleImpersonate}>
                  <SelectTrigger className="w-full md:w-[400px]">
                    <SelectValue placeholder="Choose an organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                          <span>{org.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {org.status || "active"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Impersonating an organization allows you to view their data and perform actions
                on their behalf. All actions are logged for audit purposes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access Cards */}
      {impersonatedOrganization && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => window.location.href = "/dashboard"}>
            <CardContent className="p-4">
              <h3 className="font-medium">Dashboard</h3>
              <p className="text-sm text-muted-foreground">View organization dashboard</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => window.location.href = "/projects"}>
            <CardContent className="p-4">
              <h3 className="font-medium">Projects</h3>
              <p className="text-sm text-muted-foreground">View and manage projects</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => window.location.href = "/items"}>
            <CardContent className="p-4">
              <h3 className="font-medium">Items</h3>
              <p className="text-sm text-muted-foreground">View inventory items</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SuperAdminImpersonation;
