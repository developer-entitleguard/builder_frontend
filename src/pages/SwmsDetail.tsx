import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  MessageSquareWarning,
  OctagonX,
  Siren,
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  downloadSwmsPdf,
  swmsErrorMessage,
  useAcceptSwmsMutation,
  useGetBuilderSwmsQuery,
  useMarkSwmsIncidentMutation,
  useRequestSwmsChangesMutation,
  useStopSwmsWorkMutation,
  type SwmsContact,
  type SwmsContent,
  type SwmsDocumentView,
} from "@/store/api/builderSwms";
import { RiskBandChip, SwmsStatusChip } from "@/components/swms/swmsLabels";
import {
  CONTROL_LEVEL,
  EVENT_LABEL,
  SIGNATURE_ROLE,
  formatDate,
  formatDateTime,
  hrcwLabel,
  humanize,
} from "@/lib/swmsFormat";

/**
 * Templates/SWMS PRD SW10, SW12, SW14. A SWMS received from a trade, as the
 * builder sees it: the issued content, versions with PDFs, signatures and the
 * event log, plus the builder's actions.
 */

type ActionKind = "changes" | "stop" | "incident" | null;

const SwmsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const projectId = params.get("project");
  const tradeFromRegister = params.get("trade");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useEntitlements();
  const { data: doc, isLoading, isError, error, refetch } = useGetBuilderSwmsQuery(id!, { skip: !id });

  const [accept, { isLoading: accepting }] = useAcceptSwmsMutation();
  const [action, setAction] = useState<ActionKind>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const goBack = () => {
    if (projectId) navigate(`/projects/${projectId}?tab=safety`);
    else navigate(-1);
  };

  const onAccept = async () => {
    if (!doc) return;
    try {
      await accept(doc.id).unwrap();
      toast({ title: "SWMS accepted", description: `${doc.number} v${doc.issuedVersion} is accepted.` });
    } catch (err) {
      toast({ title: "Could not accept", description: swmsErrorMessage(err), variant: "destructive" });
    }
  };

  const onDownload = async (version: number) => {
    if (!doc) return;
    setDownloading(version);
    try {
      await downloadSwmsPdf(doc.id, doc.number, version);
    } catch (err) {
      toast({ title: "Download failed", description: swmsErrorMessage(err), variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const shell = (body: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" onClick={goBack} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {projectId ? "Back to project" : "Back"}
        </Button>
        {body}
      </main>
    </div>
  );

  if (isLoading) {
    return shell(
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>,
    );
  }

  if (isError || !doc) {
    return shell(
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{swmsErrorMessage(error, "Could not load this SWMS.")}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>,
    );
  }

  const canReview = hasPermission("SWMS_REVIEW");
  const showAccept = canReview && doc.status === "ISSUED";
  const showChanges = canReview && (doc.status === "ISSUED" || doc.status === "ACCEPTED");
  const showStop =
    hasPermission("SWMS_VIEW") &&
    (doc.status === "ISSUED" || doc.status === "ACCEPTED" || doc.status === "CHANGES_REQUESTED");
  const showIncident = hasPermission("SWMS_INCIDENT") && doc.issuedVersion != null;
  // Versions are written only when issued; keep the list to issued ones.
  const versions = [...(doc.versions ?? [])]
    .filter((v) => doc.issuedVersion == null || v.version <= doc.issuedVersion)
    .sort((a, b) => b.version - a.version);
  const currentSignatures = versions.find((v) => v.version === doc.issuedVersion)?.signatures ?? [];

  return shell(
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{doc.number}</h1>
                <SwmsStatusChip status={doc.status} />
                {doc.notifiableIncidentAt && (
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
                    <Siren className="mr-1 h-3 w-3" />
                    Notifiable incident {formatDateTime(doc.notifiableIncidentAt)}
                  </Badge>
                )}
              </div>
              <p className="text-base">{doc.title}</p>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 pt-2 text-sm sm:grid-cols-2">
                <Meta label="Trade" value={doc.content?.parties?.business_name || tradeFromRegister} />
                <Meta
                  label="Version"
                  value={
                    doc.issuedVersion != null
                      ? `v${doc.issuedVersion} issued ${formatDate(doc.issuedAt)}${
                          doc.version > doc.issuedVersion ? ` · v${doc.version} in preparation` : ""
                        }`
                      : `v${doc.version}`
                  }
                />
                <Meta label="Library reference" value={doc.libraryReference} />
                <Meta
                  label="Reviewer"
                  value={doc.reviewerName ? `${doc.reviewerName}${doc.reviewedOn ? `, ${formatDate(doc.reviewedOn)}` : ""}` : null}
                />
                <Meta label="Site" value={doc.content?.parties?.site_address} />
                <Meta label="Workers signed on (current version)" value={String(doc.workersSignedCurrent ?? 0)} />
                {doc.retainUntil && <Meta label="Retain until" value={formatDate(doc.retainUntil)} />}
              </dl>
            </div>
            <div className="flex flex-wrap gap-2 md:max-w-[340px] md:justify-end">
              {doc.issuedVersion != null && (
                <Button variant="outline" size="sm" onClick={() => onDownload(doc.issuedVersion!)} disabled={downloading != null}>
                  {downloading === doc.issuedVersion ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-4 w-4" />
                  )}
                  PDF
                </Button>
              )}
              {showAccept && (
                <Button size="sm" onClick={onAccept} disabled={accepting}>
                  {accepting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                  Accept
                </Button>
              )}
              {showChanges && (
                <Button size="sm" variant="outline" onClick={() => setAction("changes")}>
                  <MessageSquareWarning className="mr-1 h-4 w-4" />
                  Request changes
                </Button>
              )}
              {showStop && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setAction("stop")}>
                  <OctagonX className="mr-1 h-4 w-4" />
                  Stop work
                </Button>
              )}
              {showIncident && (
                <Button size="sm" variant="ghost" onClick={() => setAction("incident")}>
                  <Siren className="mr-1 h-4 w-4" />
                  {doc.notifiableIncidentAt ? "Update incident" : "Mark notifiable incident"}
                </Button>
              )}
            </div>
          </div>
          {doc.status === "UNDER_REVIEW" && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This SWMS is under review by the trade. Work covered by it should not continue until a new version is issued.
              </AlertDescription>
            </Alert>
          )}
          {doc.status === "CHANGES_REQUESTED" && (
            <Alert className="mt-4">
              <MessageSquareWarning className="h-4 w-4" />
              <AlertDescription>You asked for changes. The trade will issue a new version.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {doc.content ? <SwmsContentSummary content={doc.content} /> : null}

      {/* Versions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issued versions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Signatures</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      v{v.version}
                      {v.version === doc.issuedVersion && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Current
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(v.issuedAt)}</TableCell>
                    <TableCell className="text-sm">{v.reason || "—"}</TableCell>
                    <TableCell className="text-sm">{v.signatures?.length ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => onDownload(v.version)} disabled={downloading != null}>
                        {downloading === v.version ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Signatures (current version) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Signatures{doc.issuedVersion != null ? ` · v${doc.issuedVersion}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSignatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signatures yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {currentSignatures.map((s, i) => (
                  <li key={`${s.name}-${s.signedAt}-${i}`} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {SIGNATURE_ROLE[s.role] ?? humanize(s.role)} · {s.channel}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(s.signedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">History</CardTitle>
          </CardHeader>
          <CardContent>
            {(doc.events ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No events.</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {[...doc.events].reverse().map((e) => (
                  <li key={e.id} className="border-l-2 border-muted pl-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {EVENT_LABEL[e.type] ?? humanize(e.type)}
                        {e.version != null && <span className="text-muted-foreground"> · v{e.version}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
                    </div>
                    {e.actorName && <div className="text-xs text-muted-foreground">{e.actorName}</div>}
                    {e.note && <p className="mt-0.5 whitespace-pre-wrap">{e.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <ActionDialog kind={action} doc={doc} onClose={() => setAction(null)} />
    </div>,
  );
};

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content summary
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Chips({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">None listed.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <Badge key={t} variant="secondary" className="font-normal">
          {t}
        </Badge>
      ))}
    </div>
  );
}

const yesNo = (v?: boolean) => (v == null ? null : v ? "Yes" : "No");

function SwmsContentSummary({ content }: { content: SwmsContent }) {
  const sc = content.site_conditions;
  const em = content.emergency;
  const steps = [...(content.steps ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const siteRows: [string, string | null | undefined][] = sc
    ? [
        ["Access / egress", sc.access_egress],
        [
          "Overhead powerlines",
          sc.overhead_powerlines == null
            ? null
            : sc.overhead_powerlines
            ? `Yes${sc.powerline_clearance_m != null ? ` · ${sc.powerline_clearance_m} m clearance` : ""}`
            : "No",
        ],
        ["Underground services", sc.underground_services],
        ["Ground conditions", sc.ground_conditions],
        ["Other trades", sc.other_trades],
        ["Public / traffic interface", sc.public_traffic_interface],
        ["Building year", sc.building_year != null ? String(sc.building_year) : null],
        ["Asbestos", sc.asbestos_flag ? `Possible (pre-1990)${sc.asbestos_note ? ` · ${sc.asbestos_note}` : ""}` : sc.asbestos_note],
        ["Weather", sc.weather],
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Issued content</CardTitle>
        {content.activity && <p className="text-sm text-muted-foreground">{content.activity}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {content.hazard_check_only && (
          <Alert>
            <AlertDescription>The trade marked this as a hazard check only (no high-risk construction work).</AlertDescription>
          </Alert>
        )}

        <Section title="High-risk construction work">
          {content.hrcw?.length ? (
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {content.hrcw.map((c) => (
                <li key={c}>{hrcwLabel(c)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None listed.</p>
          )}
        </Section>

        {siteRows.some(([, v]) => v) && (
          <Section title="Site conditions">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {siteRows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-muted-foreground">{k}:</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          </Section>
        )}

        {content.byda && (content.byda.enquiry_no || content.byda.date) && (
          <Section title="Before You Dig">
            <p className="text-sm">
              Enquiry {content.byda.enquiry_no || "—"}
              {content.byda.date ? ` · ${formatDate(content.byda.date)}` : ""}
              {content.byda.hand_located != null ? ` · Hand located: ${yesNo(content.byda.hand_located)}` : ""}
            </p>
          </Section>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Section title="PPE">
            <Chips items={content.ppe} />
          </Section>
          <Section title="Plant">
            <Chips items={content.plant} />
          </Section>
          <Section title="Competencies">
            <Chips items={content.competencies} />
          </Section>
        </div>

        <Section title="Steps, hazards and controls">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps.</p>
          ) : (
            <ol className="space-y-4">
              {steps.map((step, si) => (
                <li key={step.id ?? si} className="rounded-md border p-3">
                  <div className="font-medium">
                    {si + 1}. {step.task}
                  </div>
                  {(step.hazards ?? []).length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No hazards listed.</p>
                  ) : (
                    <ul className="mt-2 space-y-3">
                      {(step.hazards ?? []).map((h, hi) => (
                        <li key={h.id ?? hi} className="border-l-2 border-muted pl-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{h.description}</span>
                            {h.initial?.band && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                Initial <RiskBandChip band={h.initial.band} score={h.initial.score} />
                              </span>
                            )}
                            {h.residual?.band && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                Residual <RiskBandChip band={h.residual.band} score={h.residual.score} />
                              </span>
                            )}
                          </div>
                          {(h.controls ?? []).length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {(h.controls ?? []).map((c, ci) => (
                                <li key={c.id ?? ci} className="flex gap-2">
                                  <span className="w-28 shrink-0 text-xs text-muted-foreground">
                                    {CONTROL_LEVEL[c.level] ?? humanize(c.level)}
                                  </span>
                                  <span>{c.text}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {h.responsible && (
                            <div className="mt-0.5 text-xs text-muted-foreground">Responsible: {h.responsible}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Section>

        {em && (
          <Section title="Emergency">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <EmergencyRow label="Emergency number" value={em.emergency_number || "000"} />
              <EmergencyRow
                label="First aider"
                value={[em.first_aider, em.first_aider_phone].filter(Boolean).join(" · ")}
              />
              <EmergencyRow label="Assembly point" value={em.assembly_point} />
              <EmergencyRow label="Hospital" value={contactText(em.hospital)} />
              <EmergencyRow label="Electricity distributor" value={contactText(em.distributor)} />
              <EmergencyRow label="Gas" value={contactText(em.gas)} />
              <EmergencyRow label="Water" value={contactText(em.water)} />
              <EmergencyRow label="Regulator" value={contactText(em.regulator)} />
            </dl>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}

const contactText = (c?: SwmsContact): string | null => {
  if (!c) return null;
  const parts = [c.name, c.address, c.phone, c.distance_km != null ? `${c.distance_km} km` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

function EmergencyRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Request changes / stop work / incident
// ---------------------------------------------------------------------------

const nowLocalInput = (): string => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function ActionDialog({ kind, doc, onClose }: { kind: ActionKind; doc: SwmsDocumentView; onClose: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [at, setAt] = useState(nowLocalInput());
  const [error, setError] = useState<string | null>(null);
  const [requestChanges, { isLoading: l1 }] = useRequestSwmsChangesMutation();
  const [stopWork, { isLoading: l2 }] = useStopSwmsWorkMutation();
  const [markIncident, { isLoading: l3 }] = useMarkSwmsIncidentMutation();
  const busy = l1 || l2 || l3;

  const reset = () => {
    setText("");
    setAt(nowLocalInput());
    setError(null);
  };

  const copy = {
    changes: {
      title: "Request changes",
      description: "Tell the trade what needs to change. They'll issue a new version for you to review.",
      label: "What needs to change",
      button: "Send request",
      required: "Say what needs to change.",
    },
    stop: {
      title: "Stop work",
      description:
        "Work under this SWMS stops and it goes back to the trade for review. The trade is notified and must issue a new version.",
      label: "Reason work stopped",
      button: "Stop work",
      required: "Give the reason work stopped.",
    },
    incident: {
      title: "Mark notifiable incident",
      description:
        "Records a notifiable incident against this SWMS and extends how long the record is kept. Notify the regulator separately as required.",
      label: "What happened",
      button: "Record incident",
      required: "Describe the incident.",
    },
  } as const;

  const c = kind ? copy[kind] : null;

  const submit = async () => {
    if (!kind) return;
    const value = text.trim();
    if (!value) {
      setError(c!.required);
      return;
    }
    setError(null);
    try {
      if (kind === "changes") {
        await requestChanges({ id: doc.id, note: value }).unwrap();
        toast({ title: "Changes requested", description: "The trade has been told." });
      } else if (kind === "stop") {
        await stopWork({ id: doc.id, reason: value }).unwrap();
        toast({ title: "Work stopped", description: `${doc.number} is now under review.` });
      } else {
        await markIncident({ id: doc.id, note: value, at: at ? `${at}:00` : undefined }).unwrap();
        toast({ title: "Incident recorded" });
      }
      reset();
      onClose();
    } catch (err) {
      setError(swmsErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={kind != null}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        {c && (
          <>
            <DialogHeader>
              <DialogTitle>{c.title}</DialogTitle>
              <DialogDescription>{c.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {kind === "incident" && (
                <div className="space-y-1.5">
                  <Label htmlFor="swms-incident-at">When</Label>
                  <Input
                    id="swms-incident-at"
                    type="datetime-local"
                    value={at}
                    max={nowLocalInput()}
                    onChange={(e) => setAt(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="swms-action-text">{c.label}</Label>
                <Textarea id="swms-action-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant={kind === "stop" ? "destructive" : "default"} onClick={submit} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {c.button}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SwmsDetail;
