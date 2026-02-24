import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganization";
import SuperAdminOrganizations from "@/components/superadmin/SuperAdminOrganizations";
import SuperAdminImpersonation from "@/components/superadmin/SuperAdminImpersonation";
import { Shield } from "lucide-react";

const SuperAdmin = () => {
  const { isSuperAdmin, loading } = useOrganization();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isSuperAdmin) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Super Admin</h1>
            <p className="text-muted-foreground">Manage all organizations and users</p>
          </div>
        </div>

        <Tabs defaultValue="organizations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="impersonation">Impersonation</TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            <SuperAdminOrganizations />
          </TabsContent>

          <TabsContent value="impersonation">
            <SuperAdminImpersonation />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdmin;
