import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminPortalShell from './AdminPortalShell';
import OrgForm from '@/components/admin-portal/OrgForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCreateAdminOrgMutation, type AdminOrg } from '@/store/api/admin';

const VALID = ['BUILDER', 'MERCHANT', 'TRADE', 'AUDITOR'];

const AdminOrgCreate = () => {
  const { orgType = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createOrg, { isLoading }] = useCreateAdminOrgMutation();

  const type = orgType.toUpperCase();
  if (!VALID.includes(type)) {
    return (
      <AdminPortalShell>
        <p className="text-destructive">Unknown org type.</p>
      </AdminPortalShell>
    );
  }

  const handleSubmit = async (body: AdminOrg) => {
    try {
      const created = await createOrg({ orgType: type, body }).unwrap();
      toast({ title: 'Organization created', description: created.name });
      navigate(`/platform-admin/orgs/${type}/${created.id}`, { replace: true });
    } catch {
      toast({ title: 'Create failed', description: 'Could not create the organization', variant: 'destructive' });
    }
  };

  return (
    <AdminPortalShell>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/platform-admin/orgs')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New {type.toLowerCase()} organization</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgForm orgType={type} submitting={isLoading} submitLabel="Create" onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </AdminPortalShell>
  );
};

export default AdminOrgCreate;
