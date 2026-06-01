import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVendorScheduleQuery,
  type FreeWindow,
  type VendorDayAvailability,
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

/** Default a 1-hour booking from a window start, clamped to the window end. */
const defaultEnd = (start: string, windowEnd: string): string => {
  const [sh, sm] = start.split(":");
  const proposed = `${String(Number(sh) + 1).padStart(2, "0")}:${sm}`;
  return proposed <= windowEnd ? proposed : windowEnd;
};

const DAYS_IN_VIEW = 7;

/**
 * Schedule-aware assignment of an internal vendor to a job. Shows the vendor's
 * calendar a week at a time — free windows are clickable, booked/blocked slots
 * are shown so the scheduler can see what's taken. Picking a free window
 * pre-fills the booking, which can then be fine-tuned and confirmed. The chosen
 * time is validated against the vendor's free windows and booked on their
 * calendar.
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
  const today = format(new Date(), "yyyy-MM-dd");
  const [weekStart, setWeekStart] = useState<string>(today);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const weekEnd = useMemo(
    () => format(addDays(parseISO(weekStart), DAYS_IN_VIEW - 1), "yyyy-MM-dd"),
    [weekStart],
  );

  // Reset the view/selection each time the dialog opens.
  useEffect(() => {
    if (open) {
      setWeekStart(today);
      setSelectedDate("");
      setStartTime("");
      setEndTime("");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: scheduleResp, isFetching } = useGetVendorScheduleQuery(
    { vendorId, from: weekStart, to: weekEnd },
    { skip: !vendorId || !open },
  );
  const days: VendorDayAvailability[] = scheduleResp?.data ?? [];

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate],
  );

  const pickWindow = (date: string, w: FreeWindow) => {
    const start = toHHmm(w.startTime);
    const end = toHHmm(w.endTime);
    setSelectedDate(date);
    setStartTime(start);
    setEndTime(defaultEnd(start, end));
  };

  const windowValid = useMemo(() => {
    if (!selectedDay || !startTime || !endTime) return false;
    if (endTime <= startTime) return false;
    return selectedDay.freeWindows.some((w) =>
      within({ start: startTime, end: endTime }, w),
    );
  }, [selectedDay, startTime, endTime]);

  const [assignJobVendor, { isLoading: isAssigning }] =
    useAssignJobVendorMutation();

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
        date: selectedDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        notes: notes || undefined,
      }).unwrap();
      if (!res.success) {
        toast({
          title: "Assign failed",
          description: res.message,
          variant: "destructive",
        });
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
          <DialogTitle>Schedule {vendorName}</DialogTitle>
          <DialogDescription>
            Browse {vendorName}'s calendar and click a free window to book it.
            Booked time is shown so you can avoid clashes.
          </DialogDescription>
        </DialogHeader>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setWeekStart(
                format(addDays(parseISO(weekStart), -DAYS_IN_VIEW), "yyyy-MM-dd"),
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {format(parseISO(weekStart), "dd MMM")} –{" "}
              {format(parseISO(weekEnd), "dd MMM yyyy")}
            </span>
            {weekStart !== today && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setWeekStart(today)}
              >
                Today
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setWeekStart(
                format(addDays(parseISO(weekStart), DAYS_IN_VIEW), "yyyy-MM-dd"),
              )
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar */}
        <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-md border p-2">
          {isFetching ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading calendar…
            </div>
          ) : days.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No schedule data for this week.
            </p>
          ) : (
            days.map((day) => {
              const isSelectedDay = day.date === selectedDate;
              const nonWorking = !day.workingDay && day.freeWindows.length === 0;
              return (
                <div
                  key={day.date}
                  className={`rounded-md border p-2 ${
                    isSelectedDay ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {format(parseISO(day.date), "EEE dd MMM")}
                    </span>
                    {!nonWorking &&
                      day.workingHoursStart &&
                      day.workingHoursEnd && (
                        <span className="text-xs text-muted-foreground">
                          {toHHmm(day.workingHoursStart)}–
                          {toHHmm(day.workingHoursEnd)}
                        </span>
                      )}
                  </div>

                  {nonWorking ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Non-working day
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {day.freeWindows.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {day.freeWindows.map((w, i) => {
                            const ws = toHHmm(w.startTime);
                            const we = toHHmm(w.endTime);
                            const active =
                              isSelectedDay &&
                              startTime >= ws &&
                              endTime <= we &&
                              endTime > startTime;
                            return (
                              <Button
                                key={i}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() => pickWindow(day.date, w)}
                              >
                                {ws}–{we}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Fully booked.
                        </p>
                      )}

                      {day.bookings.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {day.bookings.map((b) => (
                            <Badge
                              key={b.id}
                              variant="secondary"
                              className="text-[10px] font-normal text-muted-foreground"
                            >
                              Booked {toHHmm(b.startTime)}–{toHHmm(b.endTime)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected slot — refine and confirm */}
        {selectedDay && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">
              {format(parseISO(selectedDate), "EEE dd MMM yyyy")}
            </p>
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
            </div>
            <p className="text-xs text-muted-foreground">
              {windowValid
                ? `Will be booked as ${startTime}–${endTime}.`
                : "Adjust the times to sit inside one of this day's free windows."}
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
