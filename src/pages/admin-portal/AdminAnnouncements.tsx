import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import AdminPortalShell from './AdminPortalShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAnnouncementsQuery,
  useSetAnnouncementActiveMutation,
  useDeleteAnnouncementMutation,
} from '@/store/api/admin';
import { audienceSummary, SEVERITY_LABELS, severityVariant } from './announcementHelpers';

const errMsg = (e: unknown, fallback: string) =>
  (e as { data?: { message?: string } })?.data?.message ?? fallback;

const AdminAnnouncements = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: announcements, isLoading } = useGetAnnouncementsQuery();
  const [setActive] = useSetAnnouncementActiveMutation();
  const [deleteAnnouncement] = useDeleteAnnouncementMutation();

  const toggleActive = async (id?: string, active?: boolean) => {
    if (!id) return;
    try {
      await setActive({ id, active: !active }).unwrap();
    } catch (e) {
      toast({ title: 'Update failed', description: errMsg(e, 'Could not change status'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deleteAnnouncement(id).unwrap();
      toast({ title: 'Announcement deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: errMsg(e, 'Could not delete'), variant: 'destructive' });
    }
  };

  return (
    <AdminPortalShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Announcements
          </h1>
          <p className="text-muted-foreground">
            Publish acknowledge modals and header banners across every portal.
          </p>
        </div>
        <Button onClick={() => navigate('/platform-admin/announcements/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New announcement
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : announcements && announcements.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Message</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead className="text-right">Acks</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-[280px]">
                  <div className="font-medium truncate">{a.title || '(untitled)'}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.message}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{a.kind === 'MODAL' ? 'Modal' : 'Banner'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={severityVariant(a.severity)}>
                    {SEVERITY_LABELS[a.severity] ?? a.severity}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-sm">{audienceSummary(a)}</TableCell>
                <TableCell className="text-right tabular-nums">{a.ackCount ?? 0}</TableCell>
                <TableCell>
                  <Switch checked={!!a.isActive} onCheckedChange={() => toggleActive(a.id, !!a.isActive)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/platform-admin/announcements/${a.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the announcement and its acknowledgements. This
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(a.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No announcements yet.</p>
          <Button onClick={() => navigate('/platform-admin/announcements/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first announcement
          </Button>
        </div>
      )}
    </AdminPortalShell>
  );
};

export default AdminAnnouncements;
