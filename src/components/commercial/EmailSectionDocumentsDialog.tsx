import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DocumentEmailBatch,
  DocumentEmailPart,
  useListDocumentEmailBatchesQuery,
  usePreviewDocumentEmailQuery,
  useRetryDocumentEmailMutation,
  useSendDocumentEmailMutation,
} from "@/store/api/commercial";
import { formatBytes, isActive } from "@/lib/documentEmail";


const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const MAX_MESSAGE = 2000;

function errMessage(e: unknown, fallback: string): string {
  return (e as { data?: { message?: string } })?.data?.message ?? fallback;
}

/**
 * Email a commercial project's Documents-tab sections to the customer — for
 * customers whose firewall blocks downloads from EntitleGuard. Each section goes
 * as its own email (split into parts when large). After sending, the dialog
 * follows the batch until every email has gone, with retry on a failed one.
 */
export function EmailSectionDocumentsDialog({ projectId, open, onOpenChange, initialSections }: {
  projectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pre-selected sections (an envelope on one section header); all sendable sections when omitted. */
  initialSections?: string[];
}) {
  const { toast } = useToast();
  const { data: preview, isFetching: loadingPreview } = usePreviewDocumentEmailQuery({ projectId }, { skip: !open, refetchOnMountOrArgChange: true });
  const [send, { isLoading: sending }] = useSendDocumentEmailMutation();
  const [retry] = useRetryDocumentEmailMutation();

  const [selected, setSelected] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [ccMe, setCcMe] = useState(true);
  const [message, setMessage] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [initialised, setInitialised] = useState(false);

  // Fill the form once per opening, from the preview.
  useEffect(() => {
    if (!open) {
      setInitialised(false);
      setBatchId(null);
      setDraft("");
      setMessage("");
      setCcMe(true);
      return;
    }
    if (!preview || initialised) return;
    const sendable = preview.sections.filter((s) => s.emailCount > 0).map((s) => s.section);
    setSelected(initialSections?.length ? initialSections.filter((s) => sendable.includes(s)) : sendable);
    setRecipients(preview.defaultRecipients.slice(0, preview.maxRecipients));
    setInitialised(true);
  }, [open, preview, initialised, initialSections]);

  // Poll only while something is still going out.
  const [poll, setPoll] = useState(false);
  const { data: batches } = useListDocumentEmailBatchesQuery(projectId, { skip: !open, pollingInterval: poll ? 3000 : 0 });
  const anyActive = (batches ?? []).some((b) => b.parts.some(isActive));
  useEffect(() => setPoll(anyActive || !!batchId && !batches?.some((b) => b.id === batchId)), [anyActive, batchId, batches]);
  const batch: DocumentEmailBatch | undefined = batches?.find((b) => b.id === batchId);
  const stillSending = !!batch && batch.parts.some(isActive);
  // Earlier sends with an email that failed, so it can be retried from here.
  const failed = (batches ?? []).flatMap((b) =>
    b.parts.filter((p) => p.status === "FAILED").map((p) => ({ part: p, to: b.recipients.join(", "), at: b.createdAt })));

  const chosen = useMemo(
    () => (preview?.sections ?? []).filter((s) => selected.includes(s.section)),
    [preview, selected],
  );
  const emailCount = chosen.reduce((n, s) => n + s.emailCount, 0);
  const skippedFiles = chosen.flatMap((s) => [...s.oversized, ...s.unavailable].map((f) => ({ ...f, section: s.title })));
  const maxRecipients = preview?.maxRecipients ?? 5;
  const maxEmails = preview?.maxEmailsPerBatch ?? 30;
  const draftValid = EMAIL_RE.test(draft.trim());

  const addDraft = () => {
    const email = draft.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return;
    if (!recipients.some((r) => r.toLowerCase() === email) && recipients.length < maxRecipients) {
      setRecipients([...recipients, email]);
    }
    setDraft("");
  };

  const toggle = (section: string) =>
    setSelected((cur) => (cur.includes(section) ? cur.filter((s) => s !== section) : [...cur, section]));

  const onSend = async () => {
    // A typed address not yet added still counts.
    const all = draftValid && !recipients.includes(draft.trim().toLowerCase())
      ? [...recipients, draft.trim().toLowerCase()]
      : recipients;
    try {
      const res = await send({
        projectId,
        body: { sections: selected, recipients: all, ccMe, message: message.trim() || undefined },
      }).unwrap();
      setRecipients(all);
      setDraft("");
      setBatchId(res.id);
    } catch (err) {
      toast({ title: "Could not send", description: errMessage(err, "The documents could not be emailed."), variant: "destructive" });
    }
  };

  const onRetry = async (partId: string) => {
    try {
      await retry({ projectId, partId }).unwrap();
      setPoll(true);
    } catch (err) {
      toast({ title: "Retry failed", description: errMessage(err, "Could not retry this email."), variant: "destructive" });
    }
  };

  const canSend = selected.length > 0 && emailCount > 0 && emailCount <= maxEmails
    && (recipients.length > 0 || draftValid) && message.length <= MAX_MESSAGE && !sending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email documents</DialogTitle>
          <DialogDescription>
            For customers who can't download from EntitleGuard (for example, a company firewall blocks it).
            Each section is sent as its own email with the documents attached. Large sections are split into
            several emails of up to {formatBytes(preview?.maxBytesPerEmail ?? 10 * 1024 * 1024)} each.
          </DialogDescription>
        </DialogHeader>

        {batchId ? (
          <SendProgress batch={batch} onRetry={onRetry} />
        ) : loadingPreview && !preview ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            {failed.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4" /> {failed.length} earlier email{failed.length === 1 ? "" : "s"} failed
                </div>
                <div className="mt-2 divide-y divide-amber-200">
                  {failed.map(({ part, to, at }) => (
                    <div key={part.id} className="flex items-center gap-3 py-1.5">
                      <span className="flex-1 text-amber-900/80">
                        {part.sectionTitle}{part.partCount > 1 ? ` · part ${part.partNo} of ${part.partCount}` : ""} to {to}
                        <span className="block text-xs">
                          {new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                          {part.error ? ` · ${part.error}` : ""}
                        </span>
                      </span>
                      <Button size="sm" variant="outline" onClick={() => onRetry(part.id)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="mb-2 block">Sections</Label>
              <div className="rounded-md border divide-y">
                {(preview?.sections ?? []).map((s) => {
                  const disabled = s.emailCount === 0;
                  return (
                    <label key={s.section} className={`flex items-center gap-3 px-3 py-2.5 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
                      <Checkbox checked={selected.includes(s.section)} disabled={disabled} onCheckedChange={() => toggle(s.section)} />
                      <span className="flex-1 text-sm font-medium">{s.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {disabled
                          ? "Nothing to send"
                          : `${s.fileCount} file${s.fileCount === 1 ? "" : "s"}, ${formatBytes(s.totalBytes)} → ${s.emailCount} email${s.emailCount === 1 ? "" : "s"}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {skippedFiles.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4" /> {skippedFiles.length} file{skippedFiles.length === 1 ? "" : "s"} can't be emailed
                </div>
                <ul className="mt-1.5 ml-6 list-disc text-amber-900/80">
                  {skippedFiles.map((f, i) => (
                    <li key={i}>
                      {f.fileName} <span className="text-xs">({f.section}, {f.bytes > 0 ? `${formatBytes(f.bytes)}, too large` : "file missing"})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-amber-900/70">
                  The email lists these so the customer knows to ask for them. Send them another way.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="doc-email-to" className="mb-2 block">Send to</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {recipients.map((r) => (
                  <Badge key={r} variant="secondary" className="gap-1 pr-1">
                    {r}
                    <button type="button" aria-label={`Remove ${r}`} onClick={() => setRecipients(recipients.filter((x) => x !== r))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {recipients.length === 0 && (
                  <span className="text-xs text-muted-foreground">No business contact found. Add an address.</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="doc-email-to"
                  type="email"
                  placeholder="Add an email address"
                  value={draft}
                  disabled={recipients.length >= maxRecipients}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addDraft();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addDraft} disabled={!draftValid || recipients.length >= maxRecipients}>
                  Add
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Up to {maxRecipients} addresses. Every email goes to all of them.</p>
              <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={ccMe} onCheckedChange={(v) => setCcMe(v === true)} />
                Send me a copy
              </label>
            </div>

            <div>
              <Label htmlFor="doc-email-message" className="mb-2 block">Message (optional)</Label>
              <Textarea
                id="doc-email-message"
                rows={3}
                maxLength={MAX_MESSAGE}
                placeholder="A short note shown in each email"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          {batchId ? (
            <>
              <span className="text-sm text-muted-foreground">
                {stillSending ? "Sending… you can close this, it carries on in the background." : "Done."}
              </span>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {emailCount > maxEmails
                  ? `That's ${emailCount} emails. Select fewer sections (at most ${maxEmails} at a time).`
                  : emailCount > 0
                    ? `This will send ${emailCount} email${emailCount === 1 ? "" : "s"}.`
                    : "Select a section with documents."}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={onSend} disabled={!canSend}>
                  {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
                  Send
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The status of each email in a just-sent batch; failed ones can be retried. */
function SendProgress({ batch, onRetry }: { batch?: DocumentEmailBatch; onRetry: (partId: string) => void }) {
  if (!batch) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        To {batch.recipients.join(", ")}{batch.cc.length > 0 ? ` (copy to ${batch.cc.join(", ")})` : ""}
      </p>
      <div className="rounded-md border divide-y">
        {batch.parts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className="flex-1">
              {p.sectionTitle}
              {p.partCount > 1 && <span className="text-muted-foreground"> · part {p.partNo} of {p.partCount}</span>}
              <span className="block text-xs text-muted-foreground">
                {p.fileCount} file{p.fileCount === 1 ? "" : "s"}, {formatBytes(p.totalBytes)}
                {p.status === "FAILED" && p.error ? ` · ${p.error}` : ""}
              </span>
            </span>
            <PartStatus part={p} onRetry={onRetry} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PartStatus({ part, onRetry }: { part: DocumentEmailPart; onRetry: (partId: string) => void }) {
  switch (part.status) {
    case "SENT":
      return <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Sent</span>;
    case "FAILED":
      return (
        <Button size="sm" variant="outline" onClick={() => onRetry(part.id)}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry
        </Button>
      );
    case "SENDING":
      return <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Sending</span>;
    default:
      return <span className="text-muted-foreground">Queued</span>;
  }
}
