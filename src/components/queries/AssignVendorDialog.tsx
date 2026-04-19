import { useEffect, useState } from "react";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useAssignQueryToVendorMutation,
  useGetVendorAvailabilityQuery,
  type VendorAvailabilityRow,
  type VendorScheduleSlot,
} from "@/store/api/vendorSchedule";

interface AssignVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryId: string;
  builderId: string;
  /** Optional default specialization filter (e.g. derived from query type). */
  defaultSpecialization?: string;
  onAssigned?: () => void;
}

const formatTime = (t: string | null) => (t ? t.split(":").slice(0, 2).join(":") : "");

export const AssignVendorDialog = ({
  open,
  onOpenChange,
  queryId,
  builderId,
  defaultSpecialization,
  onAssigned,
}: AssignVendorDialogProps) => {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [specialization, setSpecialization] = useState<string>(defaultSpecialization ?? "");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setSelectedVendorId(null);
      setSelectedSlotId(null);
      setNotes("");
    }
  }, [open]);

  const { data: availabilityResp, isFetching, refetch } = useGetVendorAvailabilityQuery(
    { builderId, date, specialization: specialization || undefined },
    { skip: !builderId || !open },
  );
  const rows: VendorAvailabilityRow[] = availabilityResp?.data ?? [];

  const [assignQuery, { isLoading: isAssigning }] = useAssignQueryToVendorMutation();

  const handleSlotPick = (vendorId: string, slot: VendorScheduleSlot) => {
    setSelectedVendorId(vendorId);
    setSelectedSlotId(slot.id);
  };

  const handleAssign = async () => {
    if (!selectedVendorId) {
      toast({ title: "Pick a vendor", description: "Select an available slot first." });
      return;
    }
    try {
      const res = await assignQuery({
        queryId,
        body: {
          vendorId: selectedVendorId,
          slotId: selectedSlotId ?? undefined,
          notes: notes || undefined,
        },
      }).unwrap();
      if (!res.success) {
        toast({ title: "Assign failed", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Vendor assigned", description: res.message });
      onAssigned?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Assign failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Assign vendor with schedule</DialogTitle>
          <DialogDescription>
            Pick an available slot from an internal vendor. The slot is booked atomically with the assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Specialization filter (optional)</Label>
            <Input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Plumbing"
              onBlur={() => refetch()}
            />
          </div>
        </div>

        <div className="border rounded-md max-h-[280px] overflow-y-auto p-2 space-y-2">
          {isFetching && <p className="text-xs text-muted-foreground">Loading availability…</p>}
          {!isFetching && rows.length === 0 && (
            <p className="text-xs text-muted-foreground">No available slots match these filters.</p>
          )}
          {rows.map((row) => (
            <div key={row.vendorId} className="border rounded-md p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{row.vendorName}</span>
                  {row.vendorType && (
                    <Badge variant={row.vendorType === "INTERNAL" ? "default" : "outline"} className="text-[10px]">
                      {row.vendorType}
                    </Badge>
                  )}
                </div>
                {row.specializations && (
                  <span className="text-xs text-muted-foreground">{row.specializations}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.slots.map((slot) => {
                  const isPicked = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSlotPick(row.vendorId, slot)}
                      className={`px-2 py-1 rounded border text-xs transition-colors ${
                        isPicked
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:border-primary"
                      }`}
                    >
                      {formatTime(slot.startTime)}
                      {slot.endTime ? ` – ${formatTime(slot.endTime)}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label>Notes for vendor (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the vendor needs to know"
            className="min-h-[60px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isAssigning || !selectedVendorId}>
            {isAssigning ? "Assigning…" : "Confirm assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignVendorDialog;
