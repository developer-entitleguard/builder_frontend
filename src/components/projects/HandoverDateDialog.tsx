import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Local-timezone "today" as yyyy-MM-dd (avoids the UTC off-by-one of toISOString). */
const todayIso = (): string => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

interface HandoverDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of registrations being handed over (drives the copy). */
  count?: number;
  loading?: boolean;
  onConfirm: (handoverDate: string) => void;
}

/**
 * Settlement/handover date popup. Defaults to today; the chosen date is stamped
 * onto the order (return-policy window) and the registration's settlement date
 * (warranty fallback anchor). The compliance gate still runs per registration.
 */
export const HandoverDateDialog = ({
  open,
  onOpenChange,
  count = 1,
  loading,
  onConfirm,
}: HandoverDateDialogProps) => {
  const [date, setDate] = useState<string>(todayIso());

  // Reset to today every time the popup is reopened.
  useEffect(() => {
    if (open) setDate(todayIso());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Handover</DialogTitle>
          <DialogDescription>
            {count > 1
              ? `${count} registration${count === 1 ? "" : "s"} will be handed over and become read-only. `
              : "This registration will be handed over and become read-only. "}
            The settlement/handover date defaults to today — change it below if
            needed. Compliance checks still apply to each registration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="handover-date">Settlement / Handover date</Label>
          <Input
            id="handover-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(date)} disabled={loading || !date}>
            {loading ? "Processing…" : "Confirm Handover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
