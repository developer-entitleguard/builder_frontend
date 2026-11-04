import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Download, FileText, Loader2, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { viewPhotoUrl } from "@/lib/api/services/files";
import { isAdministrator, readBuilderRoleFromStorage } from "@/lib/roles";
import EvidenceView from "@/components/recovery/EvidenceView";
import { FilePick } from "@/components/recovery/TargetResponsePanel";
import { useLazyLookupAssigneeOrgQuery, type AssigneeLookupApi } from "@/store/api/complianceDocuments";
import {
  COST_BASIS_LABEL,
  SIDE_LABEL,
  TARGET_TYPE_LABEL,
  fmtMoney,
  fmtRecoveryDate,
  recoveryErrorMessage,
  savePack,
  targetTypeLabel,
  useAddRecoveryEvidenceMutation,
  useAnswerRecoveryInfoMutation,
  useChooseRecoveryTargetMutation,
  useCloseRecoveryCaseMutation,
  useDownloadRecoveryPackMutation,
  useDraftRecoveryNoticeMutation,
  useGetRecoveryCaseQuery,
  useRecordRecoveryCostMutation,
  useRecordRecoveryMoneyMutation,
  useSaveRecoveryNoticeMutation,
  useSendRecoveryNoticeMutation,
  type ChainCandidate,
  type CostBasis,
  type MoneyMethod,
  type RecoveryCaseDetail as Detail,
  type RecoveryEventView,
  type TargetType,
} from "@/store/api/recovery";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Status words, as RecoveryCaseStateMachine.words gives them (for the event timeline). */
const STATUS_WORDS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  INFO_REQUESTED: "Information requested",
  NO_RESPONSE: "No response",
  ACCEPTED: "Accepted",
  FIX_OFFERED: "Fix offered",
  DISPUTED: "Disputed",
  PART_RECOVERED: "Part recovered",
  RECOVERED: "Recovered",
  CLOSED: "Closed",
};

const FINISHED = new Set(["RECOVERED", "CLOSED"]);

const eventText = (e: RecoveryEventView): string => {
  if (e.kind === "STATUS") {
    const w = (e.toStatus && STATUS_WORDS[e.toStatus]) || e.toStatus || "Status changed";
    return e.note ? `${w}: ${e.note}` : w;
  }
  if (e.kind === "MONEY") {
    if (e.method === "FIXED_BY_TARGET") {
      return `Fixed at the recipient's cost${e.amount != null ? ` (estimated saving ${fmtMoney(e.amount)})` : ""}`;
    }
    return `${e.method === "PAID" ? "Paid" : "Set off"} ${fmtMoney(e.amount)}${e.note ? `: ${e.note}` : ""}`;
  }
  if (e.kind === "REMINDER") return e.note || "Reminder";
  return e.note || "File added";
};

const Section = ({ n, title, description, children }: { n: number; title: string; description?: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">
        {n}. {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4 text-sm">{children}</CardContent>
  </Card>
);

// ------------------------------------------------------------------ 1. Chain

/** "Someone else": a recipient the record missed (DR3). Resolves on-platform trades and builders by email. */
const SomeoneElseForm = ({ detail, onDone }: { detail: Detail; onDone: () => void }) => {
  const { toast } = useToast();
  const [type, setType] = useState<TargetType | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [match, setMatch] = useState<AssigneeLookupApi | null>(null);
  const [lookup, { isFetching }] = useLazyLookupAssigneeOrgQuery();
  const [choose, { isLoading }] = useChooseRecoveryTargetMutation();

  const lookupType = type === "TRADE" || type === "BUILDER" ? type : null;
  useEffect(() => {
    const trimmed = email.trim();
    if (!lookupType || !EMAIL_RE.test(trimmed)) {
      setMatch(null);
      return;
    }
    const h = setTimeout(async () => {
      try {
        const res = await lookup(trimmed).unwrap();
        setMatch(res?.data ?? null);
      } catch {
        setMatch(null);
      }
    }, 400);
    return () => clearTimeout(h);
  }, [email, lookupType, lookup]);

  const onPlatform = !!lookupType && !!match?.matched && match.orgType === lookupType && !!match.orgId;
  const canSave = !!type && (onPlatform || !!name.trim()) && (!email.trim() || EMAIL_RE.test(email.trim())) && !isLoading && !isFetching;

  const save = async () => {
    if (!type || !canSave) return;
    try {
      await choose({
        id: detail.summary.id,
        targetType: type,
        tradeOrgId: onPlatform && type === "TRADE" ? match?.orgId ?? undefined : undefined,
        builderOrgId: onPlatform && type === "BUILDER" ? match?.orgId ?? undefined : undefined,
        name: onPlatform ? undefined : name.trim(),
        email: email.trim() || undefined,
      }).unwrap();
      toast({ title: "Recipient recorded" });
      onDone();
    } catch (e) {
      toast({ title: "Could not record the recipient", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="space-y-1">
        <Label htmlFor="recovery-other-type">Who are they?</Label>
        <Select value={type} onValueChange={(v) => setType(v as TargetType)}>
          <SelectTrigger id="recovery-other-type">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TARGET_TYPE_LABEL) as TargetType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TARGET_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="recovery-other-email">Email for the notice</Label>
        <div className="relative">
          <Input id="recovery-other-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
        {onPlatform && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>
              <strong>{match?.orgName}</strong> is on Entitle Guard and will get the notice there.
            </span>
          </div>
        )}
      </div>
      {!onPlatform && (
        <div className="space-y-1">
          <Label htmlFor="recovery-other-name">Name</Label>
          <Input id="recovery-other-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </div>
      )}
      <Button onClick={save} disabled={!canSave}>
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Use this recipient
      </Button>
    </div>
  );
};

const CandidateCard = ({
  c,
  detail,
  selected,
  onSelect,
  selectable,
}: {
  c: ChainCandidate;
  detail: Detail;
  selected: boolean;
  onSelect: () => void;
  selectable: boolean;
}) => {
  const links = detail.chain.links.filter((l) => c.linkIds.includes(l.id));
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{c.name || "Unnamed"}</span>
        <Badge variant="outline">{targetTypeLabel(c.targetType)}</Badge>
        {!c.onPlatform && <Badge variant="outline">Not on Entitle Guard</Badge>}
      </div>
      {c.workDate && <p className="text-muted-foreground">Work dated {fmtRecoveryDate(c.workDate)}</p>}
      {links.length > 0 && (
        <ul className="mt-2 space-y-1">
          {links.map((l) => (
            <li key={l.id}>
              {l.label}
              {l.source && <span className="text-muted-foreground"> (source: {l.source})</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
  if (!selectable) return <div className="rounded-md border p-3">{body}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left rounded-md border p-3 hover:bg-muted/60 ${selected ? "border-primary bg-muted" : ""}`}
    >
      {body}
    </button>
  );
};

const ChainSection = ({ detail }: { detail: Detail }) => {
  const { toast } = useToast();
  const draft = detail.summary.status === "DRAFT";
  // Nothing is preselected: the person chooses a candidate or "Someone else".
  const [choice, setChoice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [choose, { isLoading }] = useChooseRecoveryTargetMutation();
  const cands = detail.chain.candidates;
  const picked = cands.find((c) => c.key === choice) ?? null;

  const pick = (key: string) => {
    setChoice(key);
    const c = cands.find((x) => x.key === key);
    setEmail(c?.email ?? "");
  };

  const saveCandidate = async () => {
    if (!picked) return;
    if (email.trim() && !EMAIL_RE.test(email.trim())) return;
    try {
      await choose({
        id: detail.summary.id,
        candidateKey: picked.key,
        ...(email.trim() && email.trim() !== (picked.email ?? "") ? { email: email.trim() } : {}),
      }).unwrap();
      toast({ title: "Recipient recorded" });
      setChoice(null);
    } catch (e) {
      toast({ title: "Could not record the recipient", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Section
      n={1}
      title="Chain"
      description={
        draft
          ? "What the record links this defect to. Choose the recipient yourself; nothing is chosen for you."
          : "What the record links this defect to."
      }
    >
      {detail.summary.targetName && (
        <p>
          Recipient: <strong>{detail.summary.targetName}</strong>
          {detail.summary.targetType && ` (${targetTypeLabel(detail.summary.targetType)})`}
          {detail.targetEmail && <span className="text-muted-foreground">, {detail.targetEmail}</span>}
        </p>
      )}
      {cands.length === 0 ? (
        <p className="text-muted-foreground">The record doesn't link this defect to anyone.</p>
      ) : (
        <div className="space-y-2" role="group" aria-label="Linked from the record">
          {cands.map((c) => (
            <CandidateCard
              key={c.key}
              c={c}
              detail={detail}
              selectable={draft}
              selected={choice === c.key}
              onSelect={() => pick(c.key)}
            />
          ))}
        </div>
      )}
      {draft && (
        <Button
          type="button"
          variant={choice === "__other" ? "secondary" : "outline"}
          aria-pressed={choice === "__other"}
          onClick={() => setChoice("__other")}
        >
          Someone else
        </Button>
      )}
      {draft && picked && (
        <div className="space-y-3 rounded-md border p-4">
          <div className="space-y-1">
            <Label htmlFor="recovery-cand-email">Email for the notice{picked.onPlatform ? " (optional)" : ""}</Label>
            <Input id="recovery-cand-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {!picked.onPlatform && (
              <p className="text-xs text-muted-foreground">
                {picked.name || "This recipient"} is not on Entitle Guard, so the notice goes by email with a secure link.
              </p>
            )}
          </div>
          <Button onClick={saveCandidate} disabled={isLoading || (!!email.trim() && !EMAIL_RE.test(email.trim()))}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Use {picked.name || "this recipient"}
          </Button>
        </div>
      )}
      {draft && choice === "__other" && <SomeoneElseForm detail={detail} onDone={() => setChoice(null)} />}

      <div>
        <h3 className="font-medium mb-1">What the record doesn't show</h3>
        {detail.chain.gaps.length === 0 ? (
          <p className="text-muted-foreground">No gaps noted.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {detail.chain.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
};

// ------------------------------------------------------------------ 2. Cost

const CostSection = ({ detail, canMoney }: { detail: Detail; canMoney: boolean }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [basis, setBasis] = useState<CostBasis | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [record, { isLoading }] = useRecordRecoveryCostMutation();
  const open = !FINISHED.has(detail.summary.status);
  const amountOk = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0;

  const save = async () => {
    if (!amountOk || !basis) return;
    try {
      await record({ id: detail.summary.id, amount: amount.trim(), basis, file }).unwrap();
      toast({ title: "Cost recorded" });
      setAmount("");
      setBasis("");
      setFile(null);
      setFileKey((k) => k + 1);
    } catch (e) {
      toast({ title: "Could not record the cost", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Section
      n={2}
      title="Cost to rectify"
      description="What it cost you to rectify the defect. Entitle Guard does not value the defect; it records the figure you give and its basis."
    >
      {detail.summary.costAmount != null ? (
        <p>
          <strong>{fmtMoney(detail.summary.costAmount)}</strong>
          {detail.costBasis && ` (${COST_BASIS_LABEL[detail.costBasis as CostBasis] ?? detail.costBasis})`}
          {detail.costFileId && (
            <a
              href={viewPhotoUrl(detail.costFileId)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              Supporting file
            </a>
          )}
        </p>
      ) : (
        <p className="text-muted-foreground">Not recorded yet.</p>
      )}
      {open && canMoney && (
        <div className="space-y-3 rounded-md border p-4">
          <div className="space-y-1">
            <Label htmlFor="recovery-cost-amount">Amount (AUD)</Label>
            <Input
              id="recovery-cost-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="space-y-1">
            <Label id="recovery-cost-basis">Basis</Label>
            <RadioGroup aria-labelledby="recovery-cost-basis" value={basis} onValueChange={(v) => setBasis(v as CostBasis)}>
              {(Object.keys(COST_BASIS_LABEL) as CostBasis[]).map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <RadioGroupItem id={`recovery-basis-${b}`} value={b} />
                  <Label htmlFor={`recovery-basis-${b}`} className="font-normal">
                    {COST_BASIS_LABEL[b]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <FilePick
            key={fileKey}
            id="recovery-cost-file"
            label="Invoice or supporting file"
            file={file}
            onChange={setFile}
            onError={(m) => toast({ title: "File too large", description: m, variant: "destructive" })}
          />
          <Button onClick={save} disabled={!amountOk || !basis || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {detail.summary.costAmount != null ? "Update the cost" : "Record the cost"}
          </Button>
        </div>
      )}
      {open && !canMoney && detail.summary.costAmount == null && (
        <p className="text-muted-foreground">An Administrator records the cost.</p>
      )}
    </Section>
  );
};

// ------------------------------------------------------------------ 3. Notice

const NoticeSection = ({ detail, canSend }: { detail: Detail; canSend: boolean }) => {
  const { toast } = useToast();
  const [subject, setSubject] = useState(detail.noticeSubject ?? "");
  const [body, setBody] = useState(detail.noticeBody ?? "");
  const [draftNotice, { isLoading: drafting }] = useDraftRecoveryNoticeMutation();
  const [saveNotice, { isLoading: saving }] = useSaveRecoveryNoticeMutation();
  const [send, { isLoading: sending }] = useSendRecoveryNoticeMutation();

  // Follow the server copy when it changes (a fresh draft, a save, a refetch).
  useEffect(() => {
    setSubject(detail.noticeSubject ?? "");
    setBody(detail.noticeBody ?? "");
  }, [detail.noticeSubject, detail.noticeBody]);

  const open = !FINISHED.has(detail.summary.status);
  const isDraft = detail.summary.status === "DRAFT";
  const hasTarget = !!detail.summary.targetName;
  const hasCost = detail.summary.costAmount != null;
  const findings = detail.noticeFindings ?? [];
  const dirty = subject !== (detail.noticeSubject ?? "") || body !== (detail.noticeBody ?? "");
  const hasNotice = !!detail.noticeSubject && !!detail.noticeBody;

  const onDraft = async () => {
    try {
      await draftNotice(detail.summary.id).unwrap();
    } catch (e) {
      toast({ title: "Could not draft the notice", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const onSave = async () => {
    try {
      const r = await saveNotice({ id: detail.summary.id, subject, body }).unwrap();
      toast({
        title: "Notice saved",
        description: r.findings.length ? "Some wording needs to change before it can be sent." : undefined,
      });
    } catch (e) {
      toast({ title: "Could not save the notice", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const onSend = async () => {
    try {
      await send(detail.summary.id).unwrap();
      toast({ title: "Notice sent", description: `Sent to ${detail.summary.targetName}.` });
    } catch (e) {
      toast({ title: "Not sent", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const blockers = [
    !hasTarget && "choose the recipient",
    !hasCost && "record the cost",
    !hasNotice && "draft the notice",
    findings.length > 0 && "change the wording flagged below",
    dirty && "save your changes",
  ].filter(Boolean) as string[];

  return (
    <Section n={3} title="Notice" description="The notice the recipient reads, with the record of events attached.">
      {open && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onDraft} disabled={!hasTarget || drafting}>
            {drafting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Draft notice
          </Button>
          {!hasTarget && <span className="text-muted-foreground">Choose the recipient first.</span>}
          {detail.noticeDraftedByAi && hasNotice && (
            <span className="text-muted-foreground">Drafted with AI. Read it before it goes.</span>
          )}
        </div>
      )}
      {(hasNotice || dirty) && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="recovery-notice-subject">Subject</Label>
            <Input
              id="recovery-notice-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={300}
              disabled={!open}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="recovery-notice-body">Body</Label>
            <Textarea
              id="recovery-notice-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              disabled={!open}
            />
          </div>
          {findings.length > 0 && (
            <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900" role="alert">
              {findings.map((f, i) => (
                <li key={i}>
                  Remove '{f.phrase}': {f.why}
                </li>
              ))}
            </ul>
          )}
          {open && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={onSave} disabled={!dirty || !subject.trim() || !body.trim() || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save notice
              </Button>
              {isDraft && canSend && (
                <Button onClick={onSend} disabled={blockers.length > 0 || sending}>
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Approve and send
                </Button>
              )}
            </div>
          )}
          {isDraft && canSend && blockers.length > 0 && (
            <p className="text-muted-foreground">Before sending: {blockers.join(", ")}.</p>
          )}
          {isDraft && !canSend && <p className="text-muted-foreground">An Administrator approves and sends the notice.</p>}
        </div>
      )}
      {!hasNotice && !dirty && !open && <p className="text-muted-foreground">No notice was drafted.</p>}
      <div>
        <h3 className="font-medium mb-1">Your subcontract terms (attached)</h3>
        {detail.clause ? (
          <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3">{detail.clause}</p>
        ) : (
          <p className="text-muted-foreground">
            No back-charge clause on file for this recipient. Add one under Defects terms.
          </p>
        )}
      </div>
    </Section>
  );
};

// ------------------------------------------------------------------ 4. Evidence

const EvidenceSection = ({ detail }: { detail: Detail }) => {
  const { toast } = useToast();
  const [download, { isLoading }] = useDownloadRecoveryPackMutation();
  const onDownload = async () => {
    try {
      savePack(
        await download({ path: `cases/${detail.summary.id}/pack`, fallbackName: "record-of-events.zip" }).unwrap(),
      );
    } catch (e) {
      toast({ title: "Could not download", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };
  return (
    <Section n={4} title="Evidence" description="The record of events the recipient receives, with the source of each fact.">
      <div>
        <Button variant="outline" size="sm" onClick={onDownload} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Download record of events
        </Button>
      </div>
      <EvidenceView record={detail.evidence} ownRecordTitle="Their own record on this home" fileHref={viewPhotoUrl} />
    </Section>
  );
};

// ------------------------------------------------------------------ 5. Response and next steps

const MONEY_LABEL: Record<MoneyMethod, string> = {
  PAID: "They paid",
  SET_OFF: "Set off against what you pay them",
  FIXED_BY_TARGET: "They fixed it at their cost",
};

const MoneyForm = ({ detail }: { detail: Detail }) => {
  const { toast } = useToast();
  const [method, setMethod] = useState<MoneyMethod | "">("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [record, { isLoading }] = useRecordRecoveryMoneyMutation();
  const valueOk = /^\d+(\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0;

  const save = async () => {
    if (!method || !valueOk) return;
    const n = Number(value.trim());
    try {
      await record({
        id: detail.summary.id,
        method,
        ...(method === "FIXED_BY_TARGET" ? { avoidedEstimate: n } : { amount: n }),
        note: note.trim() || undefined,
      }).unwrap();
      toast({ title: "Recorded" });
      setMethod("");
      setValue("");
      setNote("");
    } catch (e) {
      toast({ title: "Could not record it", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <h3 className="font-medium">Record money</h3>
      <p className="text-muted-foreground">Entitle Guard doesn't move money or work out a set-off. Record what happened.</p>
      <div className="space-y-1">
        <Label id="recovery-money-method">What happened</Label>
        <RadioGroup
          aria-labelledby="recovery-money-method"
          value={method}
          onValueChange={(v) => {
            setMethod(v as MoneyMethod);
            setValue("");
          }}
        >
          {(Object.keys(MONEY_LABEL) as MoneyMethod[]).map((m) => (
            <div key={m} className="flex items-center gap-2">
              <RadioGroupItem id={`recovery-money-${m}`} value={m} />
              <Label htmlFor={`recovery-money-${m}`} className="font-normal">
                {MONEY_LABEL[m]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      {method && (
        <>
          <div className="space-y-1">
            <Label htmlFor="recovery-money-value">
              {method === "FIXED_BY_TARGET" ? "Estimated cost the fix saved you (AUD)" : "Amount that moved (AUD)"}
            </Label>
            <Input
              id="recovery-money-value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="recovery-money-note">Note (optional)</Label>
            <Textarea id="recovery-money-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} />
          </div>
          <Button onClick={save} disabled={!valueOk || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record
          </Button>
        </>
      )}
    </div>
  );
};

const ResponseSection = ({ detail, canSend, canMoney }: { detail: Detail; canSend: boolean; canMoney: boolean }) => {
  const { toast } = useToast();
  const id = detail.summary.id;
  const status = detail.summary.status;
  const next = detail.nextStatuses ?? [];
  const [answerNote, setAnswerNote] = useState("");
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [evNote, setEvNote] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [closeNote, setCloseNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [answer, { isLoading: answering }] = useAnswerRecoveryInfoMutation();
  const [addEvidence, { isLoading: adding }] = useAddRecoveryEvidenceMutation();
  const [resend, { isLoading: resending }] = useSendRecoveryNoticeMutation();
  const [close, { isLoading: closingNow }] = useCloseRecoveryCaseMutation();
  const tooBig = (m: string) => toast({ title: "File too large", description: m, variant: "destructive" });

  const onAnswer = async () => {
    try {
      await answer({ id, note: answerNote.trim(), file: answerFile }).unwrap();
      toast({ title: "Answer sent" });
      setAnswerNote("");
      setAnswerFile(null);
      setFileKey((k) => k + 1);
    } catch (e) {
      toast({ title: "Could not send the answer", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const onEvidence = async () => {
    try {
      await addEvidence({ id, note: evNote.trim() || undefined, file: evFile }).unwrap();
      toast({ title: "Evidence added" });
      setEvNote("");
      setEvFile(null);
      setFileKey((k) => k + 1);
    } catch (e) {
      toast({ title: "Could not add evidence", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const onResend = async () => {
    try {
      await resend(id).unwrap();
      toast({ title: "Notice resent" });
    } catch (e) {
      toast({ title: "Not sent", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const onClose = async () => {
    try {
      await close({ id, note: closeNote }).unwrap();
      toast({ title: "Case closed" });
      setClosing(false);
      setCloseNote("");
    } catch (e) {
      toast({ title: "Could not close the case", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const showResend = status !== "DRAFT" && next.includes("SENT") && canSend;
  const showMoney = canMoney && (next.includes("PART_RECOVERED") || next.includes("RECOVERED"));
  const showClose = canSend && next.includes("CLOSED");

  return (
    <Section n={5} title="Response and next steps">
      {detail.paused && <p className="text-muted-foreground">The reply-by date is paused until you answer.</p>}
      {detail.summary.responseDueOn && !FINISHED.has(status) && !detail.paused && (
        <p className="text-muted-foreground">Reply by {fmtRecoveryDate(detail.summary.responseDueOn)}.</p>
      )}
      {detail.summary.recoveredTotal ? (
        <p>
          Recorded as recovered so far: <strong>{fmtMoney(detail.summary.recoveredTotal)}</strong>
        </p>
      ) : null}

      <div>
        <h3 className="font-medium mb-1">Timeline</h3>
        {detail.events.length === 0 ? (
          <p className="text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="space-y-1">
            {detail.events.map((e) => (
              <li key={e.id}>
                <span className="tabular-nums text-muted-foreground">{fmtRecoveryDate(e.at)}</span> · {eventText(e)}
                <span className="text-muted-foreground"> ({SIDE_LABEL[e.side ?? ""] ?? "Entitle Guard"})</span>
                {e.fileId && (
                  <a
                    href={viewPhotoUrl(e.fileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    File
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {status === "INFO_REQUESTED" && (
        <div className="space-y-3 rounded-md border p-4">
          <h3 className="font-medium">Answer</h3>
          <p className="text-muted-foreground">The recipient asked for more information. Your answer restarts the reply-by date.</p>
          <div className="space-y-1">
            <Label htmlFor="recovery-answer-note">Your answer</Label>
            <Textarea id="recovery-answer-note" value={answerNote} onChange={(e) => setAnswerNote(e.target.value)} rows={4} maxLength={4000} />
          </div>
          <FilePick key={`a-${fileKey}`} id="recovery-answer-file" label="File" file={answerFile} onChange={setAnswerFile} onError={tooBig} />
          <Button onClick={onAnswer} disabled={!answerNote.trim() || answering}>
            {answering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send answer
          </Button>
        </div>
      )}

      {status !== "CLOSED" && (
        <div className="space-y-3 rounded-md border p-4">
          <h3 className="font-medium">Add evidence</h3>
          <div className="space-y-1">
            <Label htmlFor="recovery-ev-note">Note</Label>
            <Textarea id="recovery-ev-note" value={evNote} onChange={(e) => setEvNote(e.target.value)} rows={3} maxLength={4000} />
          </div>
          <FilePick key={`e-${fileKey}`} id="recovery-ev-file" label="File" file={evFile} onChange={setEvFile} onError={tooBig} />
          <Button variant="outline" onClick={onEvidence} disabled={(!evNote.trim() && !evFile) || adding}>
            {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add evidence
          </Button>
        </div>
      )}

      {showMoney && <MoneyForm detail={detail} />}

      {(showResend || showClose) && (
        <div className="flex flex-wrap gap-2">
          {showResend && (
            <Button variant="outline" onClick={onResend} disabled={resending}>
              {resending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resend notice
            </Button>
          )}
          {showClose && !closing && (
            <Button variant="outline" onClick={() => setClosing(true)}>
              Close
            </Button>
          )}
        </div>
      )}
      {showClose && closing && (
        <div className="space-y-3 rounded-md border p-4">
          <div className="space-y-1">
            <Label htmlFor="recovery-close-note">Note (optional)</Label>
            <Textarea id="recovery-close-note" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} rows={2} maxLength={2000} />
          </div>
          <p className="text-muted-foreground">Closing ends the case and withdraws the recipient's link.</p>
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={closingNow}>
              {closingNow && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Close the case
            </Button>
            <Button variant="ghost" onClick={() => setClosing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
};

/**
 * One recovery case (DR1 to DR16): chain, cost, notice, evidence, response.
 * DEFECT_RECOVERY module; Administrator and Customer Support raise and work it;
 * only an Administrator sends, records cost and money, and closes.
 */
const RecoveryCaseDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { builderRole } = useOrganization();
  const admin = isAdministrator(builderRole ?? readBuilderRoleFromStorage());
  const { data, isLoading, error } = useGetRecoveryCaseQuery(id, { skip: !id });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link to="/recovery" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Recovery cases
        </Link>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error || !data ? (
          <p className="text-sm text-destructive">{recoveryErrorMessage(error, "Could not load this case")}</p>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">{data.summary.title || "Defect"}</h1>
                <Badge variant="secondary">{data.summary.statusLabel}</Badge>
              </div>
              {data.defectDescription && (
                <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{data.defectDescription}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {data.inPeriod === true && (
                  <span>Inside your defects period (ends {fmtRecoveryDate(data.summary.periodEndsOn)})</span>
                )}
                {data.inPeriod === false && <span>Outside your defects period</span>}
                {data.queryId && (
                  <Link to={`/queries/${data.queryId}`} className="text-primary hover:underline">
                    Open the owner's query
                  </Link>
                )}
                {data.ownerDetailsShared && <span>The owner agreed to share their details with this recipient.</span>}
              </div>
            </div>
            <ChainSection key={`chain-${data.summary.status}-${data.summary.targetName ?? ""}`} detail={data} />
            <CostSection detail={data} canMoney={admin} />
            <NoticeSection detail={data} canSend={admin} />
            <EvidenceSection detail={data} />
            <ResponseSection detail={data} canSend={admin} canMoney={admin} />
          </>
        )}
      </main>
    </div>
  );
};

export default RecoveryCaseDetail;
