import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO, isBefore, startOfDay } from "date-fns";
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
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVendorScheduleQuery,
  type FreeWindow,
  type VendorDayAvailability,
  type VendorScheduleSlot,
} from "@/store/api/vendorSchedule";
import {
  useAssignJobVendorMutation,
  useGetJobBlocksQuery,
  useRemoveJobBlockMutation,
  type VendorBlock,
  type VendorBlockInput,
} from "@/lib/api/services/jobs";

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

const DAYS_IN_VIEW = 7;

const toHHmm = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  return `${h?.padStart(2, "0") ?? ""}:${m?.padStart(2, "0") ?? ""}`;
};

/** Default a 1-hour booking from a window start, clamped to the window end. */
const defaultEnd = (start: string, windowEnd: string): string => {
  const [sh, sm] = start.split(":");
  const proposed = `${String(Number(sh) + 1).padStart(2, "0")}:${sm}`;
  return windowEnd && proposed > windowEnd ? windowEnd : proposed;
};

/** Half-open overlap test on zero-padded HH:mm strings. */
const rangesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) => aStart < bEnd && aEnd > bStart;

/** A location label from a booking's denormalised query fields. */
const locationLabel = (b: {
  queryUnitNumber: string | null;
  queryAddress: string | null;
}): string => {
  const unit = b.queryUnitNumber ? `Unit ${b.queryUnitNumber}` : "";
  return [unit, b.queryAddress].filter(Boolean).join(", ");
};

/**
 * Schedule-aware allocation of an internal vendor to a job. Shows the vendor's
 * calendar a week at a time — free windows are clickable and existing bookings
 * are labelled with the task + address they're taken up by. The scheduler can
 * stage multiple time blocks for this query, double-book over existing time (a
 * block needn't use its full duration), and remove blocks already placed. Only
 * future times can be booked.
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
  const nowHHmm = format(new Date(), "HH:mm");

  const [weekStart, setWeekStart] = useState<string>(today);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [staged, setStaged] = useState<VendorBlockInput[]>([]);

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
      setStaged([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: scheduleResp, isFetching } = useGetVendorScheduleQuery(
    { vendorId, from: weekStart, to: weekEnd },
    { skip: !vendorId || !open },
  );
  const days: VendorDayAvailability[] = useMemo(
    () => scheduleResp?.data ?? [],
    [scheduleResp],
  );

  const { data: blocksResp } = useGetJobBlocksQuery(
    { id: jobId, builderId },
    { skip: !jobId || !builderId || !open },
  );
  const existingBlocks: VendorBlock[] = blocksResp?.data ?? [];

  const [assignJobVendor, { isLoading: isAssigning }] =
    useAssignJobVendorMutation();
  const [removeJobBlock, { isLoading: isRemoving }] =
    useRemoveJobBlockMutation();

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate],
  );

  const isPastDay = (date: string) =>
    isBefore(startOfDay(parseISO(date)), startOfDay(parseISO(today)));

  const timeInPast = (date: string, hhmm: string) =>
    date < today || (date === today && hhmm <= nowHHmm);

  // Occupied ranges (bookings + time-off blocks) for a given date, for the
  // double-book warning. Overlapping is allowed — this only drives the hint.
  const occupiedRanges = (date: string): Array<[string, string]> => {
    const day = days.find((d) => d.date === date);
    if (!day) return [];
    return [...day.bookings, ...day.blocks]
      .filter((s) => s.startTime && s.endTime)
      .map((s) => [toHHmm(s.startTime), toHHmm(s.endTime)] as [string, string]);
  };

  const draftOverlaps = useMemo(() => {
    if (!selectedDate || !startTime || !endTime || endTime <= startTime)
      return false;
    return occupiedRanges(selectedDate).some(([bs, be]) =>
      rangesOverlap(startTime, endTime, bs, be),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, startTime, endTime, days]);

  const draftValid =
    !!selectedDate &&
    !!startTime &&
    !!endTime &&
    endTime > startTime &&
    !timeInPast(selectedDate, startTime);

  const pickWindow = (date: string, w: FreeWindow) => {
    const ws = toHHmm(w.startTime);
    const we = toHHmm(w.endTime);
    // On today, never start a draft in the past.
    const start = date === today && ws < nowHHmm ? nowHHmm : ws;
    setSelectedDate(date);
    setStartTime(start);
    setEndTime(defaultEnd(start, we));
  };

  const addBlock = () => {
    if (!draftValid) {
      toast({
        title: "Can't add this block",
        description:
          endTime <= startTime
            ? "End time must be after the start time."
            : "Pick a future date and time.",
        variant: "destructive",
      });
      return;
    }
    setStaged((prev) => [
      ...prev,
      {
        date: selectedDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
      },
    ]);
    // Clear the draft time so the staged block is the source of truth.
    setStartTime("");
    setEndTime("");
  };

  const removeStaged = (idx: number) =>
    setStaged((prev) => prev.filter((_, i) => i !== idx));

  const handleRemoveExisting = async (slotId: string) => {
    try {
      const res = await removeJobBlock({
        id: jobId,
        builderId,
        slotId,
        queryId,
        vendorId,
      }).unwrap();
      if (!res.success) {
        toast({
          title: "Couldn't remove block",
          description: res.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Block removed" });
    } catch (e) {
      toast({
        title: "Couldn't remove block",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = async () => {
    if (staged.length === 0) {
      toast({
        title: "Add at least one time block",
        description: "Pick a free window (or a custom time) and click Add.",
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
        blocks: staged,
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
      toast({ title: "Vendor scheduled", description: res.message });
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

  const prevDisabled = weekStart === today;

  const renderBooking = (b: VendorScheduleSlot) => {
    const mine = b.queryId === queryId;
    const loc = locationLabel(b);
    return (
      <div
        key={b.id}
        className={`rounded-md border px-2 py-1 text-[11px] ${
          mine
            ? "border-primary/40 bg-primary/5"
            : "border-muted bg-muted/40 text-muted-foreground"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">
            {toHHmm(b.startTime)}–{toHHmm(b.endTime)}
          </span>
          {mine && (
            <Badge variant="default" className="h-4 px-1 text-[9px]">
              This query
            </Badge>
          )}
        </div>
        {(b.queryTitle || loc) && (
          <div className="mt-0.5 leading-tight">
            {b.queryTitle && <div className="truncate">{b.queryTitle}</div>}
            {loc && (
              <div className="flex items-center gap-1 truncate opacity-80">
                <MapPin className="h-3 w-3 shrink-0" />
                {loc}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Schedule {vendorName}</DialogTitle>
          <DialogDescription>
            Browse {vendorName}'s week, then reserve one or more time blocks for
            this query. Existing bookings show what their time is taken up by.
            You can double-book if a block won't need its full slot. Only future
            times can be booked.
          </DialogDescription>
        </DialogHeader>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={prevDisabled}
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
        <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-md border p-2">
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
              const past = isPastDay(day.date);
              const isSelectedDay = day.date === selectedDate;
              const nonWorking =
                !day.workingDay && day.freeWindows.length === 0;
              return (
                <div
                  key={day.date}
                  className={`rounded-md border p-2 ${
                    isSelectedDay ? "border-primary bg-primary/5" : ""
                  } ${past ? "opacity-50" : ""}`}
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

                  {past ? (
                    <p className="mt-1 text-xs text-muted-foreground">Past</p>
                  ) : nonWorking ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Non-working day
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {day.freeWindows.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {day.freeWindows.map((w, i) => {
                            const we = toHHmm(w.endTime);
                            // Hide windows entirely in the past on today.
                            if (day.date === today && we <= nowHHmm) return null;
                            const ws = toHHmm(w.startTime);
                            return (
                              <Button
                                key={i}
                                type="button"
                                size="sm"
                                variant="outline"
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
                          No free windows.
                        </p>
                      )}

                      {day.bookings.length > 0 && (
                        <div className="space-y-1">
                          {day.bookings.map(renderBooking)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Draft block editor */}
        {selectedDay && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
              New block · {format(parseISO(selectedDate), "EEE dd MMM yyyy")}
            </p>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  step={300}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  step={300}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <Button type="button" onClick={addBlock} disabled={!draftValid}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
            {draftOverlaps && (
              <Badge
                variant="outline"
                className="border-amber-400 text-[10px] text-amber-600"
              >
                Overlaps an existing booking — double-booked
              </Badge>
            )}
            {!draftValid && startTime && endTime && (
              <p className="text-xs text-destructive">
                {endTime <= startTime
                  ? "End must be after start."
                  : "Time must be in the future."}
              </p>
            )}
          </div>
        )}

        {/* Blocks for this query — staged (pending) + already booked */}
        {(staged.length > 0 || existingBlocks.length > 0) && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Blocks for this query</p>
            <div className="flex flex-wrap gap-1.5">
              {existingBlocks.map((b) => (
                <Badge
                  key={b.id}
                  variant="secondary"
                  className="gap-1 py-1 text-[11px]"
                >
                  {format(parseISO(b.date), "EEE dd MMM")} {toHHmm(b.startTime)}–
                  {toHHmm(b.endTime)}
                  <button
                    type="button"
                    onClick={() => handleRemoveExisting(b.id)}
                    disabled={isRemoving}
                    className="ml-0.5 rounded-sm hover:text-destructive"
                    aria-label="Remove block"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {staged.map((b, i) => (
                <Badge
                  key={`staged-${i}`}
                  variant="outline"
                  className="gap-1 border-primary/50 py-1 text-[11px] text-primary"
                >
                  {format(parseISO(b.date), "EEE dd MMM")} {toHHmm(b.startTime)}–
                  {toHHmm(b.endTime)} (new)
                  <button
                    type="button"
                    onClick={() => removeStaged(i)}
                    className="ml-0.5 rounded-sm hover:text-destructive"
                    aria-label="Remove staged block"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label>Notes for vendor (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the vendor needs to know"
            className="min-h-[56px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isAssigning || staged.length === 0}
          >
            {isAssigning
              ? "Booking…"
              : `Book ${staged.length || ""} block${
                  staged.length === 1 ? "" : "s"
                }`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JobAssignVendorDialog;
