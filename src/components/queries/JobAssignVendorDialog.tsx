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
  useGetVendorAvailabilityQuery,
  type FreeWindow,
  type VendorAvailabilityRow,
} from "@/store/api/vendorSchedule";
import { useAssignJobVendorMutation } from "@/lib/api/services/jobs";

interface JobAssignVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderId: string;
  jobId: string;
  queryId: string;
  vendorId: string;
  vendorName: string;
  onAssigned?: () => void;
}

const toHHmm = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  return `${h?.padStart(2, "0") ?? ""}:${m?.padStart(2, "0") ?? ""}`;
};

/** HH:mm string comparison is safe for zero-padded times. */
const within = (inner: { start: string; end: string }, outer: FreeWindow) =>
  toHHmm(outer.startTime) <= inner.start && inner.end <= toHHmm(outer.endTime);

/**
 * Schedule-aware assignment of an internal vendor to a job. Mirrors the old
 * query-level assign dialog but targets a single, already-picked vendor and the
 * job endpoint. The chosen time is validated against the vendor's free windows
 * and booked on their calendar.
 */
const JobAssignVendorDialog = ({
  open,
  onOpenChange,
  builderId,
  jobId,
  queryId,
  vendorId,
  vendorName,
  onAssigned,
}: JobAssignVendorDialogProps) => {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setNotes("");
      setDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open]);

  const { data: availabilityResp, isFetching } = useGetVendorAvailabilityQuery(
    { builderId, date },
    { skip: !builderId || !open },
  );
  const rows: VendorAvailabilityRow[] = availabilityResp?.data ?? [];
  const vendorRow = useMemo(
    () => rows.find((r) => r.vendorId === vendorId) ?? null,
    [rows, vendorId],
  );

  // Snap the start/end into the first free window whenever availability loads.
  useEffect(() => {
    if (!vendorRow || vendorRow.freeWindows.length === 0) return;
    const first = vendorRow.freeWindows[0];
    const start = toHHmm(first.startTime);
    setStartTime(start);
    const endHour = Math.min(
      Number(toHHmm(first.endTime).split(":")[0]),
      Number(start.split(":")[0]) + 1,
    );
    const mins = start.split(":")[1];
    const ft = toHHmm(first.endTime);
    const proposed = `${String(endHour).padStart(2, "0")}:${mins}`;
    setEndTime(proposed <= ft ? proposed : ft);
  }, [vendorRow?.vendorId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const windowValid = useMemo(() => {
    if (!vendorRow) return false;
    if (endTime <= startTime) return false;
    return vendorRow.freeWindows.some((w) => within({ start: startTime, end: endTime }, w));
  }, [vendorRow, startTime, endTime]);

  const [assignJobVendor, { isLoading: isAssigning }] = useAssignJobVendorMutation();

  const handleAssign = async () => {
    if (!windowValid) {
      toast({
        title: "Chosen time is invalid",
        description: "Pick a window inside one of the vendor's free slots.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await assignJobVendor({
        id: jobId,
        builderId,
        queryId,
        vendorId,
        date,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        notes: notes || undefined,
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Schedule {vendorName}</DialogTitle>
          <DialogDescription>
            Pick a date, then a time inside one of the vendor's free windows. The
            slot is booked on their calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="rounded-md border p-3 text-sm">
          {isFetching ? (
            <p className="text-muted-foreground">Loading availability…</p>
          ) : !vendorRow ? (
            <p className="text-muted-foreground">
              {vendorName} is not available on this date (non-working day or fully booked).
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Working {toHHmm(vendorRow.workingHoursStart)}–{toHHmm(vendorRow.workingHoursEnd)}
              </p>
              <div className="flex flex-wrap gap-1">
                {vendorRow.freeWindows.length === 0 ? (
                  <span className="text-muted-foreground">No free windows.</span>
                ) : (
                  vendorRow.freeWindows.map((w, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {toHHmm(w.startTime)}–{toHHmm(w.endTime)}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {vendorRow && vendorRow.freeWindows.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start</Label>
              <Input type="time" step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input type="time" step={300} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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

export default JobAssignVendorDialog;
