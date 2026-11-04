import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/datetime";
import {
  completionErrorMessage,
  parseChecks,
  useAcceptCheckMutation,
  useGetItemChecksQuery,
  useSendBackCheckMutation,
  type DocumentCheck,
  type ItemView,
} from "@/store/api/completion";
import { ADVISORY_NOTE, CHECK_LABEL, CHECK_ORDER, latestCheckLabel } from "./completionCopy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  item: ItemView;
  canManage: boolean;
}

const resultClass = (r: string | null | undefined) =>
  r === "PASS"
    ? "bg-green-100 text-green-800 hover:bg-green-100"
    : r === "FAIL"
    ? "bg-red-100 text-red-800 hover:bg-red-100"
    : "bg-slate-100 text-slate-700 hover:bg-slate-100";

const resultWord = (r: string | null | undefined) =>
  r === "PASS" ? "Pass" : r === "FAIL" ? "Problem" : "Not checked";

/** The failed checks' reasons, as the send-back reason is built on the backend. */
const failedReasons = (c: DocumentCheck): string =>
  parseChecks(c.checksJson)
    .filter((e) => e.result === "FAIL" && e.reason)
    .map((e) => e.reason as string)
    .join("; ");

const CheckCard = ({
  check,
  registrationId,
  item,
  canManage,
}: {
  check: DocumentCheck;
  registrationId: string;
  item: ItemView;
  canManage: boolean;
}) => {
  const { toast } = useToast();
  const [accept, { isLoading: accepting }] = useAcceptCheckMutation();
  const [sendBack, { isLoading: sending }] = useSendBackCheckMutation();
  const [sendingBack, setSendingBack] = useState(false);
  const [reason, setReason] = useState("");

  const entries = parseChecks(check.checksJson);
  const byName = new Map(entries.map((e) => [e.check, e]));
  const extra = entries.filter((e) => !(CHECK_ORDER as readonly string[]).includes(e.check));
  const reviewed = !!check.acceptedAt || !!check.sentBackAt;
  const line = { registrationId, lineType: item.lineType, lineId: item.lineId };

  const onAccept = async () => {
    try {
      await accept({ checkId: check.id, ...line }).unwrap();
      toast({ title: "Document accepted", description: item.documentName });
    } catch (e) {
      toast({ title: "Couldn't accept", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  const onSendBack = async () => {
    try {
      await sendBack({ checkId: check.id, reason, ...line }).unwrap();
      setSendingBack(false);
      toast({ title: "Sent back", description: "The trade will be asked for a new copy." });
    } catch (e) {
      toast({ title: "Couldn't send back", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={resultClass(check.result)}>{latestCheckLabel(check.result) ?? check.result}</Badge>
          {check.acceptedAt && (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Accepted {formatDateTime(check.acceptedAt)}
            </Badge>
          )}
          {check.sentBackAt && <Badge variant="secondary">Sent back {formatDateTime(check.sentBackAt)}</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">Checked {formatDateTime(check.createdAt)}</span>
      </div>

      <ul className="divide-y divide-border rounded-md border border-border">
        {CHECK_ORDER.map((name) => {
          const e = byName.get(name);
          return (
            <li key={name} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{CHECK_LABEL[name]}</p>
                <p className="text-xs text-muted-foreground break-words">
                  {e?.reason || (e ? "No reason given" : "Not checked")}
                  {e?.source_page ? ` (page ${e.source_page})` : ""}
                </p>
              </div>
              <Badge className={`shrink-0 ${resultClass(e?.result)}`}>{resultWord(e?.result)}</Badge>
            </li>
          );
        })}
        {extra.map((e, i) => (
          <li key={`extra-${i}`} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{CHECK_LABEL[e.check] ?? e.check}</p>
              <p className="text-xs text-muted-foreground break-words">{e.reason || "No reason given"}</p>
            </div>
            <Badge className={`shrink-0 ${resultClass(e.result)}`}>{resultWord(e.result)}</Badge>
          </li>
        ))}
      </ul>

      {canManage && !reviewed && (
        <div className="space-y-2">
          {sendingBack ? (
            <div className="space-y-2">
              <Label htmlFor={`sb-${check.id}`}>Why is it being sent back?</Label>
              <Textarea
                id={`sb-${check.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Say what needs to change"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onSendBack}
                  disabled={sending || !reason.trim()}
                >
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send back
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSendingBack(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={onAccept} disabled={accepting}>
                {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReason(failedReasons(check));
                  setSendingBack(true);
                }}
              >
                Send back
              </Button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export const ItemChecksDialog = ({ open, onOpenChange, registrationId, item, canManage }: Props) => {
  const { data, isLoading, error } = useGetItemChecksQuery(
    { lineType: item.lineType, lineId: item.lineId },
    { skip: !open },
  );
  const checks = data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document checks</DialogTitle>
          <DialogDescription>{item.documentName}</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Each delivered copy is checked for type, address, licence, signature, date and expiry. A pass still
          needs a person to accept it. {ADVISORY_NOTE}
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{completionErrorMessage(error, "Could not load the checks.")}</p>
        ) : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No delivered copies have been checked yet.</p>
        ) : (
          <div className="space-y-3">
            {checks.map((c) => (
              <CheckCard key={c.id} check={c} registrationId={registrationId} item={item} canManage={canManage} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ItemChecksDialog;
