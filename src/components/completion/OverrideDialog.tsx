import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  completionErrorMessage,
  useOverrideGateMutation,
  useWaiveItemMutation,
  type HomeView,
  type ItemView,
} from "@/store/api/completion";
import { WAIVER_VISIBILITY_NOTE } from "./completionCopy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  home: HomeView;
}

const key = (i: ItemView) => `${i.lineType}:${i.lineId}`;

/**
 * Administrator only. Every open item that stops handover, each with its own
 * reason. Legally required items cannot be overridden; they are waived one at a
 * time instead, and the waiver is visible to the owner and to Entitle Guard.
 */
export const OverrideDialog = ({ open, onOpenChange, home }: Props) => {
  const { toast } = useToast();
  const [override, { isLoading: overriding }] = useOverrideGateMutation();
  const [waive, { isLoading: waiving }] = useWaiveItemMutation();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setReasons({});
  }, [open]);

  const blocking = home.items.filter((i) => i.blocks && !i.exception);
  const overridable = blocking.filter((i) => !i.legallyRequired);
  const legal = blocking.filter((i) => i.legallyRequired);
  const filled = overridable.filter((i) => (reasons[key(i)] ?? "").trim());

  const setReason = (i: ItemView, v: string) => setReasons((r) => ({ ...r, [key(i)]: v }));

  const onOverride = async () => {
    try {
      await override({
        registrationId: home.registrationId,
        items: filled.map((i) => ({ lineType: i.lineType, lineId: i.lineId, reason: reasons[key(i)].trim() })),
      }).unwrap();
      toast({
        title: filled.length === 1 ? "Item overridden" : `${filled.length} items overridden`,
        description: home.label,
      });
      setReasons((r) => {
        const next = { ...r };
        filled.forEach((i) => delete next[key(i)]);
        return next;
      });
    } catch (e) {
      toast({ title: "Couldn't override", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  const onWaive = async (i: ItemView) => {
    try {
      await waive({
        registrationId: home.registrationId,
        item: { lineType: i.lineType, lineId: i.lineId, reason: (reasons[key(i)] ?? "").trim() },
      }).unwrap();
      toast({ title: "Item waived", description: i.documentName });
    } catch (e) {
      toast({ title: "Couldn't waive", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Override items that stop handover</DialogTitle>
          <DialogDescription>{home.label}</DialogDescription>
        </DialogHeader>

        {blocking.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is stopping handover for this home.</p>
        ) : (
          <div className="space-y-5">
            {overridable.length > 0 && (
              <section className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Give a reason for each item you override. Items left blank stay open.
                </p>
                {overridable.map((i) => (
                  <div key={key(i)} className="space-y-1">
                    <Label htmlFor={`ov-${key(i)}`}>{i.documentName}</Label>
                    <Textarea
                      id={`ov-${key(i)}`}
                      rows={2}
                      value={reasons[key(i)] ?? ""}
                      onChange={(e) => setReason(i, e.target.value)}
                      placeholder="Reason for overriding this item"
                    />
                  </div>
                ))}
                <Button onClick={onOverride} disabled={overriding || filled.length === 0}>
                  {overriding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Override {filled.length > 0 ? `${filled.length} ` : ""}
                  {filled.length === 1 ? "item" : "items"}
                </Button>
              </section>
            )}

            {legal.length > 0 && (
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Legally required items</h3>
                  <p className="text-sm text-muted-foreground">
                    These cannot be overridden. You can waive one with a reason.
                  </p>
                </div>
                <Alert>
                  <AlertDescription>{WAIVER_VISIBILITY_NOTE}</AlertDescription>
                </Alert>
                {legal.map((i) => (
                  <div key={key(i)} className="space-y-1 rounded-md border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`wv-${key(i)}`}>{i.documentName}</Label>
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Legally required</Badge>
                    </div>
                    <Textarea
                      id={`wv-${key(i)}`}
                      rows={2}
                      value={reasons[key(i)] ?? ""}
                      onChange={(e) => setReason(i, e.target.value)}
                      placeholder="Reason for the waiver (the owner will see this)"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onWaive(i)}
                      disabled={waiving || !(reasons[key(i)] ?? "").trim()}
                    >
                      {waiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Waive
                    </Button>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OverrideDialog;
