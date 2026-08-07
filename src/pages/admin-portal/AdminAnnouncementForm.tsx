import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminPortalShell from './AdminPortalShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import AnnouncementTargetEditor from '@/components/admin-portal/AnnouncementTargetEditor';
import {
  useGetAnnouncementQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
} from '@/store/api/admin';
import type { Announcement, AnnouncementTarget } from '@/store/api/admin/types';

const blank: Announcement = {
  kind: 'BANNER',
  severity: 'INFO',
  title: '',
  message: '',
  linkUrl: '',
  linkLabel: '',
  requiresAck: false,
  dismissible: true,
  startAt: null,
  endAt: null,
  isActive: true,
  targets: [{ scope: 'EVERYONE' }],
};

const errMsg = (e: unknown, fallback: string) =>
  (e as { data?: { message?: string } })?.data?.message ?? fallback;

/** datetime-local <-> ISO helpers (input needs "YYYY-MM-DDTHH:mm"). */
const toInput = (iso?: string | null) => (iso ? iso.slice(0, 16) : '');
const fromInput = (v: string) => (v ? v : null);

const AdminAnnouncementForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: existing, isLoading } = useGetAnnouncementQuery(isEdit ? (id as string) : null);
  const [createAnnouncement, { isLoading: creating }] = useCreateAnnouncementMutation();
  const [updateAnnouncement, { isLoading: updating }] = useUpdateAnnouncementMutation();

  const [form, setForm] = useState<Announcement>(blank);

  useEffect(() => {
    if (isEdit && existing) setForm({ ...existing, targets: existing.targets ?? [] });
  }, [isEdit, existing]);

  const set = <K extends keyof Announcement>(k: K, v: Announcement[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (!form.message.trim()) return 'Message is required.';
    if (!form.targets || form.targets.length === 0) return 'Add at least one audience.';
    for (const t of form.targets) {
      if ((t.scope === 'PORTAL' || t.scope === 'ORG') && !t.portal) return 'Pick a portal for each portal/org audience.';
      if (t.scope === 'ORG' && !t.orgId) return 'Pick an organisation for each org audience.';
      if (t.scope === 'INDIVIDUAL' && !t.recipientId) return 'Pick a person for each individual audience.';
    }
    return null;
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) {
      toast({ title: 'Check the form', description: problem, variant: 'destructive' });
      return;
    }
    const body: Announcement = {
      ...form,
      startAt: fromInput(toInput(form.startAt)),
      endAt: fromInput(toInput(form.endAt)),
    };
    try {
      if (isEdit) {
        await updateAnnouncement({ id: id as string, body }).unwrap();
        toast({ title: 'Announcement updated' });
      } else {
        await createAnnouncement(body).unwrap();
        toast({ title: 'Announcement created' });
      }
      navigate('/platform-admin/announcements');
    } catch (e) {
      toast({ title: 'Save failed', description: errMsg(e, 'Could not save'), variant: 'destructive' });
    }
  };

  if (isEdit && isLoading) {
    return (
      <AdminPortalShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminPortalShell>
    );
  }

  return (
    <AdminPortalShell>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/platform-admin/announcements')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit announcement' : 'New announcement'}</h1>

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => set('kind', v as Announcement['kind'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANNER">Banner (ribbon below header)</SelectItem>
                    <SelectItem value="MODAL">Modal (acknowledge dialog)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => set('severity', v as Announcement['severity'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Scheduled maintenance" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                rows={4}
                placeholder="The platform will be unavailable on Sunday 2–4am AEST for maintenance."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link URL (optional)</Label>
                <Input value={form.linkUrl ?? ''} onChange={(e) => set('linkUrl', e.target.value)} placeholder="https://status.entitleguard.com" />
              </div>
              <div className="space-y-2">
                <Label>Link label (optional)</Label>
                <Input value={form.linkLabel ?? ''} onChange={(e) => set('linkLabel', e.target.value)} placeholder="Status page" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Behaviour &amp; schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Requires acknowledgement</Label>
                <p className="text-xs text-muted-foreground">User must click Acknowledge (recorded). Typical for modals.</p>
              </div>
              <Switch checked={!!form.requiresAck} onCheckedChange={(v) => set('requiresAck', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Dismissible</Label>
                <p className="text-xs text-muted-foreground">User can dismiss it (also recorded so it won't reappear).</p>
              </div>
              <Switch checked={!!form.dismissible} onCheckedChange={(v) => set('dismissible', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Show from (optional)</Label>
                <Input type="datetime-local" value={toInput(form.startAt)} onChange={(e) => set('startAt', fromInput(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Show until (optional)</Label>
                <Input type="datetime-local" value={toInput(form.endAt)} onChange={(e) => set('endAt', fromInput(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={!!form.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <AnnouncementTargetEditor
              targets={form.targets ?? []}
              onChange={(targets: AnnouncementTarget[]) => set('targets', targets)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/platform-admin/announcements')}>Cancel</Button>
          <Button onClick={handleSave} disabled={creating || updating}>
            {creating || updating ? 'Saving…' : isEdit ? 'Save changes' : 'Create announcement'}
          </Button>
        </div>
      </div>
    </AdminPortalShell>
  );
};

export default AdminAnnouncementForm;
