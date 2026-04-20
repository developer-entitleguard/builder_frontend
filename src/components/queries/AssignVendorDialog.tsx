import { useEffect, useMemo, useState } from "react";
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
  type FreeWindow,
  type VendorAvailabilityRow,
} from "@/store/api/vendorSchedule";

interface AssignVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryId: string;
  builderId: string;
  defaultSpecialization?: string;
  onAssigned?: () => void;
}

const toHHmm = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  return `${h?.padStart(2, "0") ?? ""}:${m?.padStart(2, "0") ?? ""}`;
};

/** HH:mm string comparison works lexicographically — safe for zero-padded times. */
const within = (inner: { start: string; end: string }, outer: FreeWindow) =>
  toHHmm(outer.startTime) <= inner.start && inner.end <= toHHmm(outer.endTime);

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
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setSelectedVendorId(null);
      setNotes("");
    }
  }, [open]);

  const { data: availabilityResp, isFetching, refetch } = useGetVendorAvailabilityQuery(
    { builderId, date, specialization: specialization || undefined },
    { skip: !builderId || !open },
  );
  const rows: VendorAvailabilityRow[] = availabilityResp?.data ?? [];

  const [assignQuery, { isLoading: isAssigning }] = useAssignQueryToVendorMutation();

  const selectedVendor = useMemo(
    () => rows.find((r) => r.vendorId === selectedVendorId) ?? null,
    [rows, selectedVendorId],
  );

  // Whenever we select a vendor (or data refreshes), snap start/end into the
  // first free window so the defaults are always valid.
  useEffect(() => {
    if (!selectedVendor || selectedVendor.freeWindows.length === 0) return;
    const first = selectedVendor.freeWindows[0];
    setStartTime(toHHmm(first.startTime));
    // default to a 1-hour slot, clamped inside the window
    const endHour = Math.min(
      Number(toHHmm(first.endTime).split(":")[0]),
      Number(toHHmm(first.startTime).split(":")[0]) + 1,
    );
    const mins = toHHmm(first.startTime).split(":")[1];
    const ft = toHHmm(first.endTime);
    const proposed = `${String(endHour).padStart(2, "0")}:${mins}`;
    setEndTime(proposed <= ft ? proposed : ft);
  }, [selectedVendor?.vendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const windowValid = useMemo(() => {
    if (!selectedVendor) return false;
    if (endTime <= startTime) return false;
    return selectedVendor.freeWindows.some((w) => within({ start: startTime, end: endTime }, w));
  }, [selectedVendor, startTime, endTime]);

  const handleAssign = async () => {
    if (!selectedVendor) {
      toast({ title: "Pick a vendor first" });
      return;
    }
    if (!windowValid) {
      toast({
        title: "Chosen time is invalid",
        description: "The window must fall inside a free slot.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await assignQuery({
        queryId,
        body: {
          vendorId: selectedVendor.vendorId,
          date,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
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
            Internal vendors are available their working hours, Mon–Fri, minus anything they've
            blocked off. Pick a vendor, then a time inside an open window.
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

        <div className="border rounded-md max-h-[260px] overflow-y-auto p-2 space-y-2">
          {isFetching && <p className="text-xs text-muted-foreground">Loading availability…</p>}
          {!isFetching && rows.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No internal vendors available on this date.
            </p>
          )}
          {rows.map((row) => {
            const picked = selectedVendorId === row.vendorId;
            return (
              <button
                type="button"
                key={row.vendorId}
                onClick={() => setSelectedVendorId(row.vendorId)}
                className={`w-full text-left border rounded-md p-2 transition-colors ${
                  picked ? "border-primary bg-primary/5" : "hover:border-primary"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{row.vendorName}</span>
                    {row.vendorType && (
                      <Badge
                        variant={row.vendorType === "INTERNAL" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {row.vendorType}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Working {toHHmm(row.workingHoursStart)}–{toHHmm(row.workingHoursEnd)}
                  </span>
                </div>
                {row.specializations && (
                  <div className="text-xs text-muted-foreground mb-1">{row.specializations}</div>
                )}
                <div className="flex flex-wrap gap-1">
                  {row.freeWindows.map((w, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {toHHmm(w.startTime)}–{toHHmm(w.endTime)}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {selectedVendor && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start</Label>
              <Input
                type="time"
                step={300}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input
                type="time"
                step={300}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">
              {windowValid
                ? `Will be booked as ${startTime}–${endTime}.`
                : "Pick a window inside one of the vendor's free slots above."}
            </p>
          </div>
        )}

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
          <Button onClick={handleAssign} disabled={isAssigning || !windowValid}>
            {isAssigning ? "Assigning…" : "Confirm assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignVendorDialog;
