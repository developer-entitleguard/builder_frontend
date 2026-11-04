import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink, FileText, Loader2, Scale } from "lucide-react";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { viewPhotoUrl } from "@/lib/api/services/files";
import {
  coverDecisionsErrorMessage,
  coverErrorStatus,
  humanizeCode,
  parseCoverSources,
  useConfirmCoverCoveredMutation,
  useConfirmCoverDeclineMutation,
  useGetCoverCheckQuery,
  useGetCoverQueueQuery,
  type CoverCheckDetail,
  type CoverQueueRow,
} from "@/store/api/coverDecisions";

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/** Exported for the copy contract: shown when `escalatedAt` is set. */
export const WAITING_LABEL = "Waiting more than 3 business days";
export const DECLINE_LABEL = "Confirm: not a warranty repair";
export const COVERED_LABEL = "It's ours to fix";
export const NOTE_LABEL = "Note to the owner (they will read this)";
export const OWNER_SEES_LINE =
  "The owner will see your name, the reason and your note, with their consumer rights and a dispute option.";

type Path = "decline" | "covered" | null;

/**
 * The decision panel (CQ10). Two choices of equal weight, neither preselected.
 * Declining needs a reason (none preselected) and a note the owner reads.
 */
const DecisionPanel = ({ detail, onDecided }: { detail: CoverCheckDetail; onDecided: () => void }) => {
  const { toast } = useToast();
  const [path, setPath] = useState<Path>(null);
  const [reasonCode, setReasonCode] = useState<string>(detail.selectedReason ?? "");
  const [declineNote, setDeclineNote] = useState("");
  const [coveredNote, setCoveredNote] = useState("");
  const [decline, { isLoading: declining }] = useConfirmCoverDeclineMutation();
  const [covered, { isLoading: covering }] = useConfirmCoverCoveredMutation();
  const busy = declining || covering;

  const canDecline = !!reasonCode && !!declineNote.trim() && !busy;

  const onError = (err: unknown) => {
    if (coverErrorStatus(err) === 409) {
      toast({ title: "Already decided", description: coverDecisionsErrorMessage(err) });
      onDecided();
      return;
    }
    toast({ title: "Could not save the decision", description: coverDecisionsErrorMessage(err), variant: "destructive" });
  };

  const submitDecline = async () => {
    if (!canDecline) return;
    try {
      await decline({ id: detail.checkId, reasonCode, note: declineNote.trim() }).unwrap();
      toast({ title: "Decision saved", description: "The owner has been told." });
      onDecided();
    } catch (err) {
      onError(err);
    }
  };

  const submitCovered = async () => {
    if (busy) return;
    try {
      await covered({ id: detail.checkId, note: coveredNote }).unwrap();
      toast({ title: "Decision saved", description: "This query is now a warranty matter." });
      onDecided();
    } catch (err) {
      onError(err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your decision</CardTitle>
        <CardDescription>Choose one. Nothing reaches the owner until you confirm.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Decision">
          <Button
            type="button"
            variant={path === "decline" ? "secondary" : "outline"}
            aria-pressed={path === "decline"}
            onClick={() => setPath("decline")}
            disabled={busy}
          >
            {DECLINE_LABEL}
          </Button>
          <Button
            type="button"
            variant={path === "covered" ? "secondary" : "outline"}
            aria-pressed={path === "covered"}
            onClick={() => setPath("covered")}
            disabled={busy}
          >
            {COVERED_LABEL}
          </Button>
        </div>

        {path === "decline" && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="space-y-2">
              <Label id="cover-reason-label">Reason</Label>
              <RadioGroup
                aria-labelledby="cover-reason-label"
                value={reasonCode}
                onValueChange={setReasonCode}
                className="space-y-1"
              >
                {detail.reasonOptions.map((r) => (
                  <div key={r.code} className="flex items-center gap-2">
                    <RadioGroupItem id={`cover-reason-${r.code}`} value={r.code} />
                    <Label htmlFor={`cover-reason-${r.code}`} className="font-normal">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover-decline-note">{NOTE_LABEL}</Label>
              <Textarea
                id="cover-decline-note"
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                maxLength={2000}
                rows={4}
                required
                aria-required="true"
              />
            </div>
            <p className="text-sm text-muted-foreground">{OWNER_SEES_LINE}</p>
            <Button onClick={submitDecline} disabled={!canDecline}>
              {declining && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {DECLINE_LABEL}
            </Button>
          </div>
        )}

        {path === "covered" && (
          <div className="space-y-4 rounded-md border p-4">
            <p className="text-sm text-muted-foreground">This routes the query as a warranty matter.</p>
            <div className="space-y-2">
              <Label htmlFor="cover-covered-note">Note (optional)</Label>
              <Textarea
                id="cover-covered-note"
                value={coveredNote}
                onChange={(e) => setCoveredNote(e.target.value)}
                maxLength={2000}
                rows={3}
              />
            </div>
            <Button onClick={submitCovered} disabled={busy}>
              {covering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {COVERED_LABEL}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CheckDetail = ({ checkId, onDecided }: { checkId: string; onDecided: () => void }) => {
  const { data, isLoading, error } = useGetCoverCheckQuery(checkId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{coverDecisionsErrorMessage(error, "Could not load this check")}</p>;
  }

  const sources = parseCoverSources(data.sourcesJson);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{data.queryTitle || "Query"}</CardTitle>
          <CardDescription>
            <Link to={`/queries/${data.queryId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              Open the query <ExternalLink className="h-3 w-3" />
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {data.queryDescription && <p className="whitespace-pre-wrap">{data.queryDescription}</p>}
          {(data.responsibleParty || data.aiCategory) && (
            <div className="flex flex-wrap gap-2">
              {data.responsibleParty && <Badge variant="outline">Responsible: {humanizeCode(data.responsibleParty)}</Badge>}
              {data.aiCategory && <Badge variant="outline">Suggested category: {humanizeCode(data.aiCategory)}</Badge>}
            </div>
          )}

          <div>
            <h3 className="font-medium mb-1">Suggested reasoning</h3>
            <p className="whitespace-pre-wrap text-muted-foreground">{data.reasons?.trim() || "None given."}</p>
          </div>

          <div>
            <h3 className="font-medium mb-1">Sources</h3>
            {sources ? (
              <div className="space-y-1 text-muted-foreground">
                {sources.basis && <p className="whitespace-pre-wrap">{sources.basis}</p>}
                {sources.references.length > 0 && (
                  <ul className="list-disc pl-5">
                    {sources.references.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">None given.</p>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-1">Photos and files</h3>
            {data.photos.length === 0 ? (
              <p className="text-muted-foreground">None attached.</p>
            ) : (
              <ul className="space-y-1">
                {data.photos.map((p) => (
                  <li key={p.fileId}>
                    <a
                      href={viewPhotoUrl(p.fileId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {p.name || "File"}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data.history.length > 0 && (
            <div>
              <h3 className="font-medium mb-1">History</h3>
              <ul className="space-y-1 text-muted-foreground">
                {data.history.map((h, i) => (
                  <li key={i}>
                    <span className="tabular-nums">{fmtDate(h.at)}</span> · {humanizeCode(h.action)}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* key resets the panel so a new check never inherits a previous choice. */}
      <DecisionPanel key={data.checkId} detail={data} onDecided={onDecided} />
    </div>
  );
};

const QueueList = ({
  rows,
  selected,
  onSelect,
}: {
  rows: CoverQueueRow[];
  selected: string | null;
  onSelect: (id: string) => void;
}) => (
  <Card>
    <CardContent className="p-0">
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.checkId}>
            <button
              type="button"
              onClick={() => onSelect(r.checkId)}
              aria-current={selected === r.checkId ? "true" : undefined}
              className={`w-full text-left px-4 py-3 hover:bg-muted/60 ${selected === r.checkId ? "bg-muted" : ""}`}
            >
              <div className="font-medium text-sm truncate">{r.queryTitle || "Query"}</div>
              <div className="text-xs text-muted-foreground">
                {r.createdAt ? `Received ${fmtDate(r.createdAt)}` : ""}
                {r.responsibleParty ? ` · ${humanizeCode(r.responsibleParty)}` : ""}
              </div>
              {r.escalatedAt && <div className="text-xs text-muted-foreground mt-1">{WAITING_LABEL}</div>}
            </button>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

/**
 * Cover decisions (Revenue Capabilities Track F, CQ9/CQ10). COVERED_OR_QUOTED
 * module; Administrator and Customer Support (COVER_DECLINE_CONFIRM). Checks
 * that wait for a named person to decide whether a query is a warranty repair.
 */
const CoverDecisions = () => {
  const { data: rows, isLoading, error, refetch } = useGetCoverQueueQuery();
  const [params, setParams] = useSearchParams();
  const selected = params.get("check");

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("check", id);
    else next.delete("check");
    setParams(next, { replace: true });
  };

  // Drop a selection that is no longer in the queue (decided elsewhere).
  useEffect(() => {
    if (selected && rows && !rows.some((r) => r.checkId === selected)) {
      const next = new URLSearchParams(params);
      next.delete("check");
      setParams(next, { replace: true });
    }
  }, [rows, selected, params, setParams]);

  const onDecided = () => {
    select(null);
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Scale className="h-7 w-7" />
            Cover decisions
          </h1>
          <p className="text-muted-foreground mt-1">
            Queries that may not be a warranty repair. A person on your team decides each one before the owner hears.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{coverDecisionsErrorMessage(error, "Could not load cover decisions")}</p>
        ) : !rows || rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nothing waiting for a decision.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <QueueList rows={rows} selected={selected} onSelect={select} />
            <div>
              {selected && rows.some((r) => r.checkId === selected) ? (
                <CheckDetail checkId={selected} onDecided={onDecided} />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Choose a query to review it.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoverDecisions;
