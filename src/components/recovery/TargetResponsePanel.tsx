import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isOversizeUpload, MAX_UPLOAD_LABEL, oversizeUploadMessage } from "@/lib/uploadLimits";
import EvidenceView from "@/components/recovery/EvidenceView";
import { fmtRecoveryDate, type TargetAction, type TargetView } from "@/store/api/recovery";

const ACTION_LABEL: Record<TargetAction, string> = {
  ACCEPT: "Accept",
  OFFER_FIX: "Offer to fix it",
  DISPUTE: "Dispute",
  REQUEST_INFO: "Ask for more information",
};

const ACTION_ORDER: TargetAction[] = ["ACCEPT", "OFFER_FIX", "DISPUTE", "REQUEST_INFO"];

const NOTE_LABEL: Record<TargetAction, string> = {
  ACCEPT: "Note (optional)",
  OFFER_FIX: "How and when you'll fix it",
  DISPUTE: "Why you dispute it",
  REQUEST_INFO: "What information you need",
};

const NOTE_REQUIRED: Record<TargetAction, boolean> = {
  ACCEPT: false,
  OFFER_FIX: true,
  DISPUTE: true,
  REQUEST_INFO: true,
};

/** A single optional file picker that refuses files over the upload limit. */
export const FilePick = ({
  id,
  label,
  file,
  onChange,
  onError,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  onError: (message: string) => void;
}) => (
  <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="file"
      onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        if (f && isOversizeUpload(f)) {
          onError(oversizeUploadMessage(f));
          e.target.value = "";
          onChange(null);
          return;
        }
        onChange(f);
      }}
    />
    <p className="text-xs text-muted-foreground">
      {file ? file.name : `Optional. Up to ${MAX_UPLOAD_LABEL}.`}
    </p>
  </div>
);

export interface TargetResponseHandlers {
  /** Resolves true when saved; shows its own error and resolves false otherwise. */
  respond: (action: TargetAction, note: string, file: File | null) => Promise<boolean>;
  addEvidence: (note: string, file: File | null) => Promise<boolean>;
  download: () => Promise<void>;
  /** Shows an error message (toast or inline). */
  onError: (message: string) => void;
  fileHref?: (fileId: string) => string | null;
}

/**
 * The recipient's screen for a recovery notice: the builder incoming screen
 * and the public no-login page. Shows the notice, the reply-by date (or the
 * pause), the record of events and the subcontract clause, and only the
 * response buttons the API lists in `actions`. Nothing is preselected. Never
 * shows other cases or any count of cases.
 */
const TargetResponsePanel = ({ view, handlers }: { view: TargetView; handlers: TargetResponseHandlers }) => {
  const [action, setAction] = useState<TargetAction | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [evNote, setEvNote] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [evKey, setEvKey] = useState(0);
  const [evBusy, setEvBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const closed = view.status === "CLOSED";
  const actions = ACTION_ORDER.filter((a) => view.actions.includes(a));
  const canSubmit = !!action && (!NOTE_REQUIRED[action] || !!note.trim()) && !busy;

  const submit = async () => {
    if (!action || !canSubmit) return;
    setBusy(true);
    try {
      const ok = await handlers.respond(action, note.trim(), action === "DISPUTE" ? file : null);
      if (!ok) return;
      setAction(null);
      setNote("");
      setFile(null);
    } finally {
      setBusy(false);
    }
  };

  const submitEvidence = async () => {
    if (!evNote.trim() && !evFile) return;
    setEvBusy(true);
    try {
      const ok = await handlers.addEvidence(evNote.trim(), evFile);
      if (!ok) return;
      setEvNote("");
      setEvFile(null);
      setEvKey((k) => k + 1);
    } finally {
      setEvBusy(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await handlers.download();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{view.noticeSubject || view.record.title || "Notice"}</CardTitle>
            <Badge variant="secondary">{view.statusLabel}</Badge>
          </div>
          <CardDescription>
            {view.builderName ? `From ${view.builderName}. ` : ""}
            {!closed &&
              (view.paused
                ? `Paused while ${view.builderName || "the builder"} answers your question.`
                : view.replyBy
                  ? `Reply by ${fmtRecoveryDate(view.replyBy)}.`
                  : "")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{view.noticeBody || ""}</p>
        </CardContent>
      </Card>

      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your response</CardTitle>
            <CardDescription>Choose one. The builder sees your response and anything you attach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Response">
              {actions.map((a) => (
                <Button
                  key={a}
                  type="button"
                  variant={action === a ? "secondary" : "outline"}
                  aria-pressed={action === a}
                  onClick={() => setAction(a)}
                  disabled={busy}
                >
                  {ACTION_LABEL[a]}
                </Button>
              ))}
            </div>
            {action && (
              <div className="space-y-3 rounded-md border p-4">
                <div className="space-y-1">
                  <Label htmlFor="recovery-response-note">{NOTE_LABEL[action]}</Label>
                  <Textarea
                    id="recovery-response-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    aria-required={NOTE_REQUIRED[action]}
                  />
                </div>
                {action === "DISPUTE" && (
                  <FilePick
                    id="recovery-response-file"
                    label="Add your own evidence"
                    file={file}
                    onChange={setFile}
                    onError={handlers.onError}
                  />
                )}
                <Button onClick={submit} disabled={!canSubmit}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {ACTION_LABEL[action]}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Record of events</CardTitle>
            <Button variant="outline" size="sm" onClick={download} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download record of events
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EvidenceView record={view.record} ownRecordTitle="Your own record on this home" fileHref={handlers.fileHref} />
        </CardContent>
      </Card>

      {view.clause && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">The builder's subcontract terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{view.clause}</p>
          </CardContent>
        </Card>
      )}

      {!closed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add evidence</CardTitle>
            <CardDescription>Add a note, a file or both. The builder sees it on the record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="recovery-evidence-note">Note</Label>
              <Textarea
                id="recovery-evidence-note"
                value={evNote}
                onChange={(e) => setEvNote(e.target.value)}
                rows={3}
                maxLength={4000}
              />
            </div>
            <FilePick key={evKey} id="recovery-evidence-file" label="File" file={evFile} onChange={setEvFile} onError={handlers.onError} />
            <Button onClick={submitEvidence} disabled={evBusy || (!evNote.trim() && !evFile)}>
              {evBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add evidence
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TargetResponsePanel;
