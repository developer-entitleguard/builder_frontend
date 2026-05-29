import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, ShieldAlert, Loader2, FileCheck2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetHandoverReadinessQuery,
  useAcknowledgeHandoverMutation,
} from "@/store/api/complianceDocuments";

interface HandoverReadinessCardProps {
  registrationId: string;
}

export const HandoverReadinessCard = ({ registrationId }: HandoverReadinessCardProps) => {
  const { toast } = useToast();
  const { data, isLoading } = useGetHandoverReadinessQuery({ registrationId });
  const [acknowledge, { isLoading: acknowledging }] = useAcknowledgeHandoverMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState("");

  const readiness = data?.data;

  if (isLoading || !readiness) {
    return null;
  }

  const { blocked, acknowledged, outstandingDocuments, completeness } = readiness;

  const handleAcknowledge = async () => {
    try {
      const res = await acknowledge({ registrationId, note: note.trim() || undefined }).unwrap();
      if (!res.success) throw new Error(res.message);
      toast({
        title: "Acknowledgement recorded",
        description: "Handover can now proceed despite outstanding documents.",
      });
      setDialogOpen(false);
      setNote("");
    } catch {
      toast({ title: "Couldn't record acknowledgement", variant: "destructive" });
    }
  };

  if (!blocked) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Ready for handover</AlertTitle>
        <AlertDescription>
          {completeness.outstandingRequired === 0
            ? "All required compliance documents have been received."
            : acknowledged
              ? "Outstanding documents were acknowledged as delivered offline. Handover can proceed."
              : "No required documents are outstanding."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Handover blocked</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            {completeness.outstandingRequired} required compliance document(s) are still
            outstanding. Attach the missing documents, or acknowledge that they were delivered
            offline, before completing handover.
          </p>
          {outstandingDocuments.length > 0 && (
            <ul className="list-disc list-inside text-sm mb-3">
              {outstandingDocuments.map((name, i) => (
                <li key={`${name}-${i}`}>{name}</li>
              ))}
            </ul>
          )}
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <FileCheck2 className="h-4 w-4 mr-2" />
            Acknowledge delivered offline
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={dialogOpen} onOpenChange={(next) => !acknowledging && setDialogOpen(next)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Acknowledge offline delivery</DialogTitle>
            <DialogDescription>
              Record that the outstanding required documents were delivered to the homeowner
              outside the system. This unblocks handover and is logged for audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="ack-note">Note (optional)</Label>
            <Textarea
              id="ack-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Hard copies handed over at settlement on 12 June."
              disabled={acknowledging}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={acknowledging}>
              Cancel
            </Button>
            <Button onClick={handleAcknowledge} disabled={acknowledging}>
              {acknowledging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording…
                </>
              ) : (
                "Record acknowledgement"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
