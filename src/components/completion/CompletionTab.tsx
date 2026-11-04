import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Send,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { statusBadgeClass, statusLabel } from "@/components/compliance/complianceConstants";
import {
  completionErrorMessage,
  useChaseItemNowMutation,
  useDownloadEvidencePackMutation,
  useGetProjectCompletionQuery,
  useRevokeExceptionMutation,
  useUpdateCompletionStateMutation,
  type HomeView,
  type ItemView,
  type ClearableField,
  type StatePatch,
} from "@/store/api/completion";
import {
  ADVISORY_NOTE,
  READINESS_CLASS,
  READINESS_LABEL,
  fmtDay,
  fmtMoney,
  latestCheckLabel,
  useCompletionAccess,
} from "./completionCopy";
import { ItemChecksDialog } from "./ItemChecksDialog";
import { OverrideDialog } from "./OverrideDialog";
import { FirstAgmCard } from "./FirstAgmCard";
import { ReferenceNumberField } from "./ReferenceNumberField";

interface Access {
  canManage: boolean;
  isAdmin: boolean;
}

/** Shared by the target date, the dates panel and the claim amount. */
const useSaveState = (home: HomeView) => {
  const { toast } = useToast();
  const [update, { isLoading }] = useUpdateCompletionStateMutation();
  const save = async (patch: StatePatch, done = "Saved") => {
    try {
      await update({ registrationId: home.registrationId, patch }).unwrap();
      toast({ title: done, description: home.label });
      return true;
    } catch (e) {
      toast({ title: "Couldn't save", description: completionErrorMessage(e), variant: "destructive" });
      return false;
    }
  };
  return { save, saving: isLoading };
};

const ReadinessChip = ({ readiness }: { readiness: HomeView["readiness"] }) => (
  <Badge className={READINESS_CLASS[readiness] ?? ""} title={ADVISORY_NOTE}>
    {READINESS_LABEL[readiness] ?? readiness}
  </Badge>
);

const TargetDate = ({ home, editable }: { home: HomeView; editable: boolean }) => {
  const { save, saving } = useSaveState(home);
  const [value, setValue] = useState(home.targetPcDate ?? "");
  useEffect(() => setValue(home.targetPcDate ?? ""), [home.targetPcDate]);
  if (!editable) return <span>{fmtDay(home.targetPcDate)}</span>;
  const dirty = !!value && value !== (home.targetPcDate ?? "");
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-40"
        aria-label="Target completion date"
      />
      {dirty && (
        <Button size="sm" variant="outline" className="h-8" disabled={saving} onClick={() => save({ targetPcDate: value }, "Target date saved")}>
          Save
        </Button>
      )}
      {!dirty && home.targetPcDate && (
        <Button size="sm" variant="ghost" className="h-8" disabled={saving} onClick={() => save({ clear: ["targetPcDate"] }, "Target date cleared")}>
          Clear
        </Button>
      )}
    </span>
  );
};

const ClaimAmount = ({ home, isAdmin }: { home: HomeView; isAdmin: boolean }) => {
  const { save, saving } = useSaveState(home);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(home.finalClaimAmount?.toString() ?? "");
  // Hidden when null for anyone but an Administrator (the backend nulls it for them).
  if (!isAdmin) {
    return home.finalClaimAmount == null ? null : <span>Final claim {fmtMoney(home.finalClaimAmount)}</span>;
  }
  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        Final claim {fmtMoney(home.finalClaimAmount)}
        <Button
          size="sm"
          variant="link"
          className="h-auto p-0"
          onClick={() => {
            setValue(home.finalClaimAmount?.toString() ?? "");
            setEditing(true);
          }}
        >
          {home.finalClaimAmount == null ? "Set" : "Edit"}
        </Button>
        {home.finalClaimAmount != null && (
          <Button
            size="sm"
            variant="link"
            className="h-auto p-0"
            disabled={saving}
            onClick={() => save({ clear: ["finalClaimAmount"] }, "Final claim amount cleared")}
          >
            Clear
          </Button>
        )}
      </span>
    );
  }
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(n) && n >= 0;
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-36"
        aria-label="Final claim amount"
      />
      <Button
        size="sm"
        className="h-8"
        disabled={saving || !valid}
        onClick={async () => {
          if (await save({ finalClaimAmount: n }, "Final claim amount saved")) setEditing(false);
        }}
      >
        Save
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </span>
  );
};

const DatesPanel = ({ home }: { home: HomeView }) => {
  const { save, saving } = useSaveState(home);
  const [cert, setCert] = useState(home.certificateDate ?? "");
  const [issued, setIssued] = useState(home.claimIssuedAt ?? "");
  const [paid, setPaid] = useState(home.claimPaidAt ?? "");
  useEffect(() => setCert(home.certificateDate ?? ""), [home.certificateDate]);
  useEffect(() => setIssued(home.claimIssuedAt ?? ""), [home.claimIssuedAt]);
  useEffect(() => setPaid(home.claimPaidAt ?? ""), [home.claimPaidAt]);

  const clearButton = (fields: ClearableField[], saved: string | null, label = "Clear", title?: string) =>
    saved ? (
      <Button
        type="button"
        size="sm"
        variant="link"
        className="h-auto p-0 text-xs"
        disabled={saving}
        title={title}
        onClick={() => save({ clear: fields }, fields.length > 1 ? "Dates cleared" : "Date cleared")}
      >
        {label}
      </Button>
    ) : null;

  const patch: StatePatch = {};
  if (cert && cert !== (home.certificateDate ?? "")) patch.certificateDate = cert;
  if (issued && issued !== (home.claimIssuedAt ?? "")) patch.claimIssuedAt = issued;
  if (paid && paid !== (home.claimPaidAt ?? "")) patch.claimPaidAt = paid;
  const changed = Object.keys(patch).length > 0;
  const paidProblem =
    paid && !issued
      ? "Record the claim issued date first."
      : paid && issued && paid < issued
      ? "The claim cannot be paid before it was issued."
      : null;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`cert-${home.registrationId}`}>Certificate date</Label>
            {clearButton(["certificateDate"], home.certificateDate)}
          </div>
          <Input id={`cert-${home.registrationId}`} type="date" value={cert} onChange={(e) => setCert(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`iss-${home.registrationId}`}>Final claim issued</Label>
            {home.claimPaidAt
              ? clearButton(["claimIssuedAt", "claimPaidAt"], home.claimIssuedAt, "Clear issued and paid", "The paid date is cleared too")
              : clearButton(["claimIssuedAt"], home.claimIssuedAt)}
          </div>
          <Input id={`iss-${home.registrationId}`} type="date" value={issued} onChange={(e) => setIssued(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`paid-${home.registrationId}`}>Final claim paid</Label>
            {clearButton(["claimPaidAt"], home.claimPaidAt)}
          </div>
          <Input id={`paid-${home.registrationId}`} type="date" value={paid} onChange={(e) => setPaid(e.target.value)} />
        </div>
      </div>
      {paidProblem && <p className="text-xs text-destructive">{paidProblem}</p>}
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={saving || !changed || !!paidProblem} onClick={() => save(patch, "Dates saved")}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save dates
        </Button>
        <span className="text-xs text-muted-foreground">
          Practical completion is recorded with the existing mark-complete action.
        </span>
      </div>
    </div>
  );
};

const ItemRow = ({ home, item, access }: { home: HomeView; item: ItemView; access: Access }) => {
  const { toast } = useToast();
  const [chase, { isLoading: chasing }] = useChaseItemNowMutation();
  const [revoke, { isLoading: revoking }] = useRevokeExceptionMutation();
  const [checksOpen, setChecksOpen] = useState(false);
  const checkWord = latestCheckLabel(item.latestCheck);
  const open = item.daysOutstanding != null;

  const onChase = async () => {
    try {
      await chase({ registrationId: home.registrationId, lineType: item.lineType, lineId: item.lineId }).unwrap();
      toast({ title: "Request sent", description: item.documentName });
    } catch (e) {
      toast({ title: "Couldn't send the request", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  const onRevoke = async () => {
    if (!item.exception) return;
    try {
      await revoke({ registrationId: home.registrationId, exceptionId: item.exception.id }).unwrap();
      toast({ title: item.exception.type === "WAIVER" ? "Waiver removed" : "Override removed", description: item.documentName });
    } catch (e) {
      toast({ title: "Couldn't remove it", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <TableRow>
      <TableCell className="align-top">
        <p className="font-medium">{item.documentName}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.blocks && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Stops handover</Badge>}
          {item.legallyRequired && <Badge variant="outline">Legally required</Badge>}
          {item.escalated && <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Escalated</Badge>}
        </div>
        {access.canManage && item.attachmentId && (
          <ReferenceNumberField attachmentId={item.attachmentId} referenceNumber={item.referenceNumber} />
        )}
        {!access.canManage && item.referenceNumber && (
          <p className="mt-1 text-xs text-muted-foreground">Reference: {item.referenceNumber}</p>
        )}
        {item.exception && (
          <div className="mt-1 text-xs">
            <span className="font-medium">{item.exception.type === "WAIVER" ? "Waived" : "Overridden"}:</span>{" "}
            <span className="text-muted-foreground">{item.exception.reason}</span>
            {access.isAdmin && (
              <Button size="sm" variant="link" className="h-auto p-0 ml-2 text-xs" disabled={revoking} onClick={onRevoke}>
                Remove
              </Button>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="align-top">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(item.status)}`}>
          {statusLabel(item.status)}
        </span>
      </TableCell>
      <TableCell className="align-top text-sm">{item.assignee ?? <span className="text-muted-foreground">Not assigned</span>}</TableCell>
      <TableCell className="align-top text-sm">{item.daysOutstanding ?? "—"}</TableCell>
      <TableCell className="align-top text-sm">
        {checkWord ?? "—"}
        {item.chaseCount != null && item.chaseCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Asked {item.chaseCount} time{item.chaseCount === 1 ? "" : "s"}
          </p>
        )}
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-wrap justify-end gap-1">
          {access.canManage && open && !item.exception && (
            <Button size="sm" variant="outline" disabled={chasing} onClick={onChase}>
              {chasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send request now
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setChecksOpen(true)}>
            View checks
          </Button>
        </div>
        {checksOpen && (
          <ItemChecksDialog
            open={checksOpen}
            onOpenChange={setChecksOpen}
            registrationId={home.registrationId}
            item={item}
            canManage={access.canManage}
          />
        )}
      </TableCell>
    </TableRow>
  );
};

const HomeCard = ({ home, access }: { home: HomeView; access: Access }) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [download, { isLoading: downloading }] = useDownloadEvidencePackMutation();
  const blocking = home.items.filter((i) => i.blocks && !i.exception).length;

  const onPack = async () => {
    try {
      const { url, filename } = await download({ registrationId: home.registrationId }).unwrap();
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Couldn't download the evidence pack", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Card id={`home-${home.registrationId}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 text-left"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold">{home.label}</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <ReadinessChip readiness={home.readiness} />
            {home.handedOver && <Badge variant="secondary">Handed over</Badge>}
            <Badge variant="outline">
              {home.openItems} open item{home.openItems === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="text-muted-foreground">Target date</span>
            <TargetDate home={home} editable={access.canManage} />
          </span>
          <span>
            <span className="text-muted-foreground">Practical completion</span> {fmtDay(home.pcDate)}
          </span>
          <ClaimAmount home={home} isAdmin={access.isAdmin} />
        </div>
        {home.nextAction && (
          <p className="text-sm">
            <span className="text-muted-foreground">Next: </span>
            {home.nextAction}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onPack} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Evidence pack
          </Button>
          {access.canManage && (
            <Button size="sm" variant="outline" onClick={() => setDatesOpen((v) => !v)}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Dates
            </Button>
          )}
          {access.isAdmin && blocking > 0 && (
            <Button size="sm" variant="outline" onClick={() => setOverrideOpen(true)}>
              <ShieldAlert className="h-4 w-4 mr-2" />
              Override
            </Button>
          )}
        </div>
        {datesOpen && access.canManage && <DatesPanel home={home} />}

        {expanded &&
          (home.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No required items for this home.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Days outstanding</TableHead>
                    <TableHead>Latest check</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {home.items.map((i) => (
                    <ItemRow key={`${i.lineType}:${i.lineId}`} home={home} item={i} access={access} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </CardContent>
      {access.isAdmin && <OverrideDialog open={overrideOpen} onOpenChange={setOverrideOpen} home={home} />}
    </Card>
  );
};

/** Project page tab: every home on the project and what still stands between it and handover. */
export const CompletionTab = ({ projectId, isStrata }: { projectId: string; isStrata?: boolean }) => {
  const access = useCompletionAccess();
  const { data, isLoading, error } = useGetProjectCompletionQuery({ projectId }, { skip: !access.canView });
  const homes = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Readiness shows whether the documents are in place. {ADVISORY_NOTE}
        </span>
      </div>

      {isStrata && access.canManage && <FirstAgmCard projectId={projectId} />}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{completionErrorMessage(error, "Could not load completion.")}</p>
      ) : homes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No homes on this project yet.</p>
      ) : (
        homes.map((h) => <HomeCard key={h.registrationId} home={h} access={access} />)
      )}
    </div>
  );
};

export default CompletionTab;
