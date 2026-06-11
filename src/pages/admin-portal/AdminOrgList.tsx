import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AdminPortalShell from './AdminPortalShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetAdminOrgsQuery } from '@/store/api/admin';

const ORG_TYPES = ['BUILDER', 'MERCHANT', 'TRADE', 'AUDITOR'] as const;

const OrgTypeTable = ({ orgType }: { orgType: string }) => {
  const navigate = useNavigate();
  const { data: orgs, isLoading, isError } = useGetAdminOrgsQuery(orgType);

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Failed to load organizations.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate(`/platform-admin/orgs/${orgType}/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          New {orgType.toLowerCase()} org
        </Button>
      </div>
      {orgs && orgs.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ABN</TableHead>
              <TableHead>Contact email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => (
              <TableRow
                key={org.id}
                className="cursor-pointer"
                onClick={() => navigate(`/platform-admin/orgs/${orgType}/${org.id}`)}
              >
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{org.abn || '—'}</TableCell>
                <TableCell>{org.contactEmail || '—'}</TableCell>
                <TableCell>
                  <Badge variant={org.isActive === false ? 'secondary' : 'default'}>
                    {org.isActive === false ? 'Inactive' : 'Active'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground py-6">No {orgType.toLowerCase()} organizations yet.</p>
      )}
    </div>
  );
};

const AdminOrgList = () => {
  const [tab, setTab] = useState<string>('BUILDER');
  return (
    <AdminPortalShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">Create and manage builders, merchants, trades and auditors.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          {ORG_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>
        {ORG_TYPES.map((t) => (
          <TabsContent key={t} value={t}>
            {tab === t && <OrgTypeTable orgType={t} />}
          </TabsContent>
        ))}
      </Tabs>
    </AdminPortalShell>
  );
};

export default AdminOrgList;
