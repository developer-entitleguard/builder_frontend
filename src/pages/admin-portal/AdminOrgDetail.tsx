import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminPortalShell from './AdminPortalShell';
import OrgForm from '@/components/admin-portal/OrgForm';
import OrgCapabilities from '@/components/admin-portal/OrgCapabilities';
import OrgUsers from '@/components/admin-portal/OrgUsers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useGetAdminOrgQuery, useUpdateAdminOrgMutation, type AdminOrg } from '@/store/api/admin';

const AdminOrgDetail = () => {
  const { orgType = '', id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const type = orgType.toUpperCase();

  const { data: org, isLoading, isError } = useGetAdminOrgQuery({ orgType: type, id });
  const [updateOrg, { isLoading: saving }] = useUpdateAdminOrgMutation();

  const handleSave = async (body: AdminOrg) => {
    try {
      await updateOrg({ orgType: type, id, body }).unwrap();
      toast({ title: 'Saved', description: 'Organization updated' });
    } catch {
      toast({ title: 'Save failed', description: 'Could not update the organization', variant: 'destructive' });
    }
  };

  return (
    <AdminPortalShell>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/platform-admin/orgs')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to organizations
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError || !org ? (
        <p className="text-sm text-destructive">Organization not found.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <Badge variant="outline">{type}</Badge>
            <Badge variant={org.isActive === false ? 'secondary' : 'default'}>
              {org.isActive === false ? 'Inactive' : 'Active'}
            </Badge>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <OrgForm orgType={type} initial={org} submitting={saving} submitLabel="Save changes" onSubmit={handleSave} />
            </TabsContent>

            <TabsContent value="capabilities">
              <OrgCapabilities orgType={type} orgId={id} />
            </TabsContent>

            <TabsContent value="users">
              <OrgUsers orgType={type} orgId={id} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </AdminPortalShell>
  );
};

export default AdminOrgDetail;
