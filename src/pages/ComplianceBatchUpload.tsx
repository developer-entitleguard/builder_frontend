import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Upload,
  CheckCircle2,
  FileWarning,
  Building2,
  Layers,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";

interface BatchItem {
  itemId: string;
  unitLabel: string | null;
  documentId: string | null;
  status: string | null;
  rejectionReason: string | null;
}

interface BatchGroup {
  documentName: string | null;
  tier: string | null;
  category: string | null;
  items: BatchItem[];
}

interface BatchView {
  recipientEmail: string | null;
  projectName: string | null;
  note: string | null;
  totalItems: number;
  completedItems: number;
  groups: BatchGroup[];
}

/** What the next file selection should be routed to. */
type PendingAction =
  | { kind: "item"; itemId: string }
  | { kind: "group"; itemIds: string[] };

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.heic";

const isReceived = (s: string | null) => (s ?? "").toUpperCase() === "RECEIVED";
const isSubmitted = (s: string | null) => (s ?? "").toUpperCase() === "SUBMITTED";

/**
 * Compliance request batch — public, no-login page. One 30-day magic-link token
 * (in the URL) covers MANY document requests: every unit of a per-unit document
 * (and, later, several documents) on a single page. The recipient uploads each,
 * or applies one file to all units at once.
 */
const ComplianceBatchUpload = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingAction | null>(null);

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<BatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  // Key of the item/group currently uploading, so we disable just that control.
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("This link is missing its token.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/unsecure/compliance/batch?token=${encodeURIComponent(token)}`
      );
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message || "This link is invalid or has expired.");
      } else {
        setView(body.data as BatchView);
        setError(null);
      }
    } catch {
      setError("Something went wrong loading this request.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const promptFile = (action: PendingAction, key: string) => {
    if (busyKey) return;
    pendingRef.current = action;
    setBusyKey(key);
    fileInputRef.current?.click();
  };

  const onFileChosen = async (file: File | undefined) => {
    const action = pendingRef.current;
    pendingRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !action) {
      setBusyKey(null);
      return;
    }
    setError(null);
    setBanner(null);
    try {
      const form = new FormData();
      form.append("file", file);
      let url: string;
      if (action.kind === "item") {
        form.append("itemId", action.itemId);
        url = `${getApiBaseUrl()}/unsecure/compliance/batch/upload?token=${encodeURIComponent(token)}`;
      } else {
        action.itemIds.forEach((id) => form.append("itemIds", id));
        url = `${getApiBaseUrl()}/unsecure/compliance/batch/upload-many?token=${encodeURIComponent(token)}`;
      }
      const res = await fetch(url, { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message || "Upload failed. Please try again.");
      } else {
        setBanner(body.message || "Uploaded — the builder will review it.");
        await load();
      }
    } catch {
      setError("Something went wrong during upload.");
    } finally {
      setBusyKey(null);
    }
  };

  const allDone = useMemo(
    () => !!view && view.totalItems > 0 && view.completedItems >= view.totalItems,
    [view]
  );
  const pct = useMemo(
    () => (view && view.totalItems > 0 ? Math.round((view.completedItems / view.totalItems) * 100) : 0),
    [view]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center p-4">
      <div className="w-full max-w-2xl space-y-4 py-6">
        {/* Shared hidden file input, routed by pendingRef. */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onFileChosen(e.target.files?.[0])}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Document upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error && !view ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <FileWarning className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : (
              view && (
                <>
                  <div>
                    {view.projectName && (
                      <p className="text-sm text-muted-foreground">for {view.projectName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Requested from {view.recipientEmail}
                    </p>
                  </div>
                  {view.note && <p className="text-sm text-muted-foreground">{view.note}</p>}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {view.completedItems} / {view.totalItems} uploaded
                      </span>
                      {allDone && (
                        <span className="flex items-center gap-1 font-medium text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" /> All done
                        </span>
                      )}
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Allowed: PDF, PNG, JPG, JPEG, HEIC · max 10 MB per file · no login required
                  </p>
                  {banner && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {banner}
                    </div>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </>
              )
            )}
          </CardContent>
        </Card>

        {view &&
          view.groups.map((group, gi) => {
            const pending = group.items.filter((it) => !isReceived(it.status));
            const pendingIds = pending.map((it) => it.itemId);
            const multiUnit = group.items.length > 1 || group.items.some((it) => it.unitLabel);
            const groupKey = `group-${gi}`;
            const groupDone = pending.length === 0;
            return (
              <Card key={groupKey}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center justify-between gap-3">
                    <span>{group.documentName ?? "Document"}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {group.items.filter((it) => isReceived(it.status) || isSubmitted(it.status)).length}
                      /{group.items.length}
                    </span>
                  </CardTitle>
                  {multiUnit && !groupDone && (
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!busyKey}
                        onClick={() => promptFile({ kind: "group", itemIds: pendingIds }, groupKey)}
                      >
                        {busyKey === groupKey ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Layers className="h-4 w-4 mr-2" />
                        )}
                        Apply one file to all {pending.length} remaining{" "}
                        {pending.length === 1 ? "unit" : "units"}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.items.map((item) => {
                    const itemKey = `item-${item.itemId}`;
                    const received = isReceived(item.status);
                    const submitted = isSubmitted(item.status);
                    return (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.unitLabel ?? group.documentName ?? "Document"}
                          </p>
                          {item.rejectionReason && !received && (
                            <p className="text-xs text-destructive">
                              Previously rejected: {item.rejectionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {received ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Received
                            </Badge>
                          ) : submitted ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Awaiting review
                            </Badge>
                          ) : null}
                          {!received && (
                            <Button
                              size="sm"
                              variant={submitted ? "outline" : "default"}
                              disabled={!!busyKey}
                              onClick={() => promptFile({ kind: "item", itemId: item.itemId }, itemKey)}
                            >
                              {busyKey === itemKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-1.5" />
                                  {submitted ? "Replace" : "Upload"}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
};

export default ComplianceBatchUpload;
