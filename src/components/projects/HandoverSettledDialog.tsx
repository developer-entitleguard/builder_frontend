import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface HandoverSettledDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of registrations in play (drives the copy). */
  count?: number;
  /** The home is handed over & settled — go straight to the handover flow. */
  onYes: () => void;
  /** Not handed over yet — continue the normal send-entitlement flow. */
  onNo: () => void;
}

/**
 * Handover shortcut prompt shown when an activity-tracking builder clicks "Send".
 * The two-step Send → Handover flow only makes sense when the builder hasn't
 * settled yet; if they have, they can skip straight to handover. Choosing "Yes"
 * routes into the existing HandoverDateDialog + handover call; "No" continues the
 * existing send-entitlement flow.
 */
export const HandoverSettledDialog = ({
  open,
  onOpenChange,
  count = 1,
  onYes,
  onNo,
}: HandoverSettledDialogProps) => {
  const plural = count > 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {plural ? "Have these homes been handed over?" : "Have you handed over the house?"}
          </DialogTitle>
          <DialogDescription>
            {plural
              ? `Have these ${count} homes been handed over to the homeowners and settled? ` +
                "If so, you can hand them over now instead of just sending the entitlement."
              : "Has this home been handed over to the homeowner and settled? If so, you can " +
                "hand it over now instead of just sending the entitlement."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onNo}>
            No — just send
          </Button>
          <Button onClick={onYes}>
            Yes — hand {plural ? "them" : "it"} over
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
