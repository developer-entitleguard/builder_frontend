import { useState } from "react";
import {
  ScrollText,
  Plus,
  Star,
  Archive as ArchiveIcon,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { getApiBaseUrl } from "@/lib/config";
import {
  useListOrgTermsVersionsQuery,
  useGetOrgTermsVersionQuery,
  useCreateOrgTermsVersionMutation,
  usePromoteOrgTermsVersionMutation,
  useArchiveOrgTermsVersionMutation,
  type OrgTermsVersionDto,
} from "@/store/api";

/**
 * Per PRD_Org_Terms_And_Conditions §10.2. Builder portal Admin → Terms tab.
 * Mirrors the merchant frontend's OrgTermsManagement component, adjusted for
 * the builder portal's API + UI primitives.
 */
export function OrgTermsManagement() {
  const { data: versions = [], isLoading } = useListOrgTermsVersionsQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<OrgTermsVersionDto | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<OrgTermsVersionDto | null>(null);

  const [promote] = usePromoteOrgTermsVersionMutation();
  const [archive] = useArchiveOrgTermsVersionMutation();
  const { toast } = useToast();

  const hasDefault = versions.some((v) => v.isDefault && !v.isArchived);

  const onPromote = async () => {
    if (!promoteTarget) return;
    try {
      await promote(promoteTarget.id).unwrap();
      toast({ title: "Default updated", description: promoteTarget.title });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Promote failed",
        description: errorMessage(err),
      });
    }
    setPromoteTarget(null);
  };

  const onArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archive(archiveTarget.id).unwrap();
      toast({ title: "Archived", description: archiveTarget.title });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Archive failed",
        description: errorMessage(err),
      });
    }
    setArchiveTarget(null);
  };

  return (
    <div className="space-y-4">
      {!isLoading && !hasDefault && versions.length === 0 && <NoVersionsBanner />}
      {!isLoading && !hasDefault && versions.length > 0 && <NoDefaultBanner />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Terms &amp; Conditions
          </CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New version
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-sm text-muted-foreground text-center">Loading…</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground text-center">
              No T&amp;C versions yet. Click <span className="font-medium">New version</span> to create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.title}</TableCell>
                    <TableCell>{v.effectiveDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {v.isDefault && (
                          <Badge className="bg-green-600 hover:bg-green-600">Default</Badge>
                        )}
                        {v.isArchived && <Badge variant="secondary">Archived</Badge>}
                        {!v.isDefault && !v.isArchived && (
                          <Badge variant="outline">Available</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewId(v.id)}
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!v.isDefault && !v.isArchived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPromoteTarget(v)}
                          aria-label="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      {!v.isDefault && !v.isArchived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setArchiveTarget(v)}
                          aria-label="Archive"
                        >
                          <ArchiveIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateVersionDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {viewId && <ViewVersionDialog id={viewId} onClose={() => setViewId(null)} />}

      <AlertDialog
        open={!!promoteTarget}
        onOpenChange={(o) => !o && setPromoteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set as default?</AlertDialogTitle>
            <AlertDialogDescription>
              "{promoteTarget?.title}" will be applied to all new registrations and orders going
              forward. Existing artefacts keep whatever version was already stamped on them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onPromote}>Set as default</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this version?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveTarget?.title}" will no longer appear in pickers for new registrations.
              Existing artefacts already pointing at it are unaffected (the snapshot on issued
              orders is preserved). You cannot un-archive in v1 — create a new version instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NoVersionsBanner() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <div className="font-medium">No Terms &amp; Conditions set yet.</div>
      <div className="opacity-80">
        Customers will not receive a T&amp;C document with their property handover until you create
        your first version.
      </div>
    </div>
  );
}

function NoDefaultBanner() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <div className="font-medium">No default T&amp;C version selected.</div>
      <div className="opacity-80">
        New registrations and handovers won't auto-attach Terms until you set a default. Use the
        <Star className="inline h-3 w-3 mx-1" /> button on a non-archived row to promote it.
      </div>
    </div>
  );
}

function CreateVersionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [create, { isLoading }] = useCreateOrgTermsVersionMutation();
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [content, setContent] = useState("<p></p>");
  const [notes, setNotes] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);

  const reset = () => {
    setTitle("");
    setEffectiveDate(today);
    setContent("<p></p>");
    setNotes("");
    setPdf(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stripped = content.replace(/<[^>]+>/g, "").trim();
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }
    if (!stripped) {
      toast({ variant: "destructive", title: "Content cannot be empty" });
      return;
    }
    if (pdf && pdf.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "PDF too large", description: "Max 5MB" });
      return;
    }
    try {
      const created = await create({
        dto: { title: title.trim(), content, effectiveDate, notes: notes || null },
        pdf,
      }).unwrap();
      toast({ title: "Version created", description: created.title });
      reset();
      onClose();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: errorMessage(err),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Terms &amp; Conditions version</DialogTitle>
          <DialogDescription>
            Versions are immutable once created — to change content you must create a new version.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tc-title">Title (internal label)</Label>
            <Input
              id="tc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
            <div className="text-xs text-muted-foreground">
              Shown in the admin UI only. Customers don't see this label.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tc-effective">Effective date</Label>
              <Input
                id="tc-effective"
                type="date"
                min={today}
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tc-pdf">PDF override (optional)</Label>
              <Input
                id="tc-pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-muted-foreground">
                Leave blank to render from the editor content. Max 5MB.
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Content (customer-facing)</Label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tc-notes">Internal change notes (optional)</Label>
            <Textarea
              id="tc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="e.g. Updated handover clause for new state legislation."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewVersionDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useGetOrgTermsVersionQuery(id);
  const apiBase = getApiBaseUrl();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.title ?? "Terms version"}</DialogTitle>
          <DialogDescription>
            Effective {data?.effectiveDate} ·{" "}
            {data?.isDefault
              ? "Current default"
              : data?.isArchived
              ? "Archived"
              : "Available"}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="py-8 text-sm text-muted-foreground text-center">Loading…</div>
        ) : (
          <div className="space-y-4">
            {data.notes && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Internal notes
                </div>
                {data.notes}
              </div>
            )}
            <div
              className="prose prose-sm max-w-none rounded-md border p-4"
              // Server-sanitised HTML — safe to render. See PRD §EC-16.
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
            {data.pdfFileId && (
              <div>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`${apiBase}/api/files/${data.pdfFileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function errorMessage(err: unknown): string {
  if (typeof err === "object" && err && "data" in err) {
    const data = (err as { data?: { message?: string } | string }).data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data && "message" in data && typeof data.message === "string") {
      return data.message;
    }
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
