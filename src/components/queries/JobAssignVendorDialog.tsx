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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVendorScheduleQuery,
  type VendorDayAvailability,
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
const HOUR_PX = 48; // pixel height of one hour row
const GUTTER_PX = 56; // width of the left time gutter
const SNAP_MIN = 30; // click snaps to the nearest 30 minutes
const DEFAULT_DURATION = 60; // a fresh block defaults to 1 hour

const toHHmm = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  return `${h?.padStart(2, "0") ?? ""}:${m?.padStart(2, "0") ?? ""}`;
};

/** "HH:mm[:ss]" → minutes since midnight. */
const hmToMin = (raw: string | null | undefined): number => {
  if (!raw) return 0;
  const [h, m] = raw.split(":");
  return Number(h) * 60 + Number(m);
};

/** minutes since midnight → "HH:mm" (zero-padded). */
const minToHHmm = (min: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Default a 1-hour booking from a window start, clamped to the window end. */
const defaultEnd = (start: string, windowEnd: string): string => {
  const [sh, sm] = start.split(":");
  const proposed = `${String(Number(sh) + 1).padStart(2, "0")}:${sm}`;
  return windowEnd && proposed > windowEnd ? windowEnd : proposed;
};

const hourLabel = (h: number): string => {
  const ampm = h < 12 || h === 24 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
};

/** Half-open overlap test on zero-padded HH:mm strings. */
const rangesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) => aStart < bEnd && aEnd > bStart;

const locationLabel = (b: {
  queryUnitNumber: string | null;
  queryAddress: string | null;
}): string => {
  const unit = b.queryUnitNumber ? `Unit ${b.queryUnitNumber}` : "";
  return [unit, b.queryAddress].filter(Boolean).join(", ");
};

type EventKind = "booking" | "block" | "staged" | "draft";

interface GridEvent {
  key: string;
  start: number; // minutes since midnight
  end: number;
  kind: EventKind;
  mine?: boolean;
  label: string;
  sub?: string;
  slotId?: string;
  stagedIdx?: number;
  lane: number;
  laneCount: number;
}

/**
 * Pack a day's events into side-by-side lanes so overlapping (double-booked)
 * blocks render next to each other, like Google Calendar. Events are grouped
 * into clusters of chained overlaps; within a cluster each event gets the first
 * lane free at its start, and every event in the cluster shares the cluster's
 * lane count for its width.
 */
const layoutDay = (events: Omit<GridEvent, "lane" | "laneCount">[]): GridEvent[] => {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: GridEvent[] = [];
  let cluster: Array<Omit<GridEvent, "lane" | "laneCount"> & { lane: number }> = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds: number[] = [];
    cluster.forEach((ev) => {
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > ev.start) lane += 1;
      ev.lane = lane;
      laneEnds[lane] = ev.end;
    });
    const laneCount = laneEnds.length || 1;
    cluster.forEach((ev) => out.push({ ...ev, laneCount }));
    cluster = [];
  };

  sorted.forEach((ev) => {
    if (cluster.length === 0 || ev.start < clusterEnd) {
      cluster.push({ ...ev, lane: 0 });
      clusterEnd = Math.max(clusterEnd, ev.end);
    } else {
      flush();
      cluster.push({ ...ev, lane: 0 });
      clusterEnd = ev.end;
    }
  });
  flush();
  return out;
};

/**
 * Schedule-aware allocation of an internal vendor to a job, on a Google-style
 * time grid: hours down the left, the vendor's week across, existing bookings
 * shown as positioned blocks labelled with the task + address they're taken up
 * by. Click an empty slot to drop a block (double-book by clicking beside an
 * existing one), stage several, then book. Only future times can be booked.
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
  const nowMin = hmToMin(nowHHmm);

  const [view, setView] = useState<"calendar" | "list">("calendar");
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

  useEffect(() => {
    if (open) {
      setView("calendar");
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

  const isPastDay = (date: string) =>
    isBefore(startOfDay(parseISO(date)), startOfDay(parseISO(today)));

  const timeInPast = (date: string, hhmm: string) =>
    date < today || (date === today && hhmm <= nowHHmm);

  // Visible hour window: wide enough to show working hours + every event.
  const { startHour, endHour, hours, gridHeight } = useMemo(() => {
    let minM = 7 * 60;
    let maxM = 19 * 60;
    const consider = (s?: string | null, e?: string | null) => {
      if (s) minM = Math.min(minM, hmToMin(s));
      if (e) maxM = Math.max(maxM, hmToMin(e));
    };
    days.forEach((d) => {
      consider(d.workingHoursStart, d.workingHoursEnd);
      [...d.bookings, ...d.blocks].forEach((s) =>
        consider(s.startTime, s.endTime),
      );
    });
    staged.forEach((b) => consider(b.startTime, b.endTime));
    if (selectedDate && startTime && endTime)
      consider(`${startTime}:00`, `${endTime}:00`);
    const sh = Math.max(0, Math.floor(minM / 60));
    const eh = Math.min(24, Math.ceil(maxM / 60));
    const safeEh = eh > sh ? eh : sh + 1;
    return {
      startHour: sh,
      endHour: safeEh,
      hours: Array.from({ length: safeEh - sh }, (_, i) => sh + i),
      gridHeight: (safeEh - sh) * HOUR_PX,
    };
  }, [days, staged, selectedDate, startTime, endTime]);

  const startMin = startHour * 60;
  const endMin = endHour * 60;

  const occupiedRanges = (date: string): Array<[string, string]> => {
    const day = days.find((d) => d.date === date);
    if (!day) return [];
    return [...day.bookings, ...day.blocks]
      .filter((s) => s.startTime && s.endTime)
      .map((s) => [toHHmm(s.startTime), toHHmm(s.endTime)] as [string, string]);
  };

  const draftValid =
    !!selectedDate &&
    !!startTime &&
    !!endTime &&
    endTime > startTime &&
    !timeInPast(selectedDate, startTime);

  const draftOverlaps = useMemo(() => {
    if (!selectedDate || !startTime || !endTime || endTime <= startTime)
      return false;
    return occupiedRanges(selectedDate).some(([bs, be]) =>
      rangesOverlap(startTime, endTime, bs, be),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, startTime, endTime, days]);

  const eventsForDay = (day: VendorDayAvailability): GridEvent[] => {
    const raw: Omit<GridEvent, "lane" | "laneCount">[] = [];
    day.bookings.forEach((b) => {
      if (!b.startTime || !b.endTime) return;
      const mine = b.queryId === queryId;
      raw.push({
        key: `bk-${b.id}`,
        start: hmToMin(b.startTime),
        end: hmToMin(b.endTime),
        kind: "booking",
        mine,
        label: b.queryTitle || (mine ? "This query" : "Booked"),
        sub: locationLabel(b),
        slotId: mine ? b.id : undefined,
      });
    });
    day.blocks.forEach((b) => {
      if (!b.startTime || !b.endTime) return;
      raw.push({
        key: `bl-${b.id}`,
        start: hmToMin(b.startTime),
        end: hmToMin(b.endTime),
        kind: "block",
        label: b.notes || "Unavailable",
      });
    });
    staged.forEach((b, i) => {
      if (b.date !== day.date) return;
      raw.push({
        key: `st-${i}`,
        start: hmToMin(b.startTime),
        end: hmToMin(b.endTime),
        kind: "staged",
        label: "New block",
        stagedIdx: i,
      });
    });
    if (
      selectedDate === day.date &&
      startTime &&
      endTime &&
      endTime > startTime
    ) {
      raw.push({
        key: "draft",
        start: hmToMin(startTime),
        end: hmToMin(endTime),
        kind: "draft",
        label: "New block",
      });
    }
    return layoutDay(raw);
  };

  // List view: clicking a free window pre-fills the draft (future-clamped).
  const pickWindow = (
    date: string,
    w: { startTime: string; endTime: string },
  ) => {
    const ws = toHHmm(w.startTime);
    const we = toHHmm(w.endTime);
    const start = date === today && ws < nowHHmm ? nowHHmm : ws;
    setSelectedDate(date);
    setStartTime(start);
    setEndTime(defaultEnd(start, we));
  };

  const handleColumnClick = (
    day: VendorDayAvailability,
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (isPastDay(day.date)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let minute = startMin + Math.round((y / HOUR_PX) * 60 / SNAP_MIN) * SNAP_MIN;
    // Never let a draft start in the past.
    if (day.date === today && minute < nowMin) {
      minute = Math.ceil(nowMin / SNAP_MIN) * SNAP_MIN;
    }
    minute = Math.max(startMin, Math.min(minute, endMin - SNAP_MIN));
    const end = Math.min(minute + DEFAULT_DURATION, endMin);
    if (end <= minute) return;
    setSelectedDate(day.date);
    setStartTime(minToHHmm(minute));
    setEndTime(minToHHmm(end));
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
    setStartTime("");
    setEndTime("");
    setSelectedDate("");
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
    } catch (err) {
      toast({
        title: "Couldn't remove block",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = async () => {
    if (staged.length === 0) {
      toast({
        title: "Add at least one time block",
        description: "Click an empty slot on the calendar, then Add.",
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
    } catch (err) {
      toast({
        title: "Assign failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const prevDisabled = weekStart === today;

  const eventClasses: Record<EventKind, string> = {
    booking: "", // overridden below for mine/other
    block: "border border-muted-foreground/30 text-muted-foreground",
    staged: "border-2 border-dashed border-primary bg-primary/15 text-primary",
    draft: "border-2 border-dashed border-primary/60 bg-primary/5 text-primary",
  };

  const renderEvent = (ev: GridEvent) => {
    const top = ((ev.start - startMin) / 60) * HOUR_PX;
    const height = Math.max(((ev.end - ev.start) / 60) * HOUR_PX, 16);
    const widthPct = 100 / ev.laneCount;
    const removable =
      (ev.kind === "booking" && ev.mine && ev.slotId) ||
      ev.kind === "staged";
    const colour =
      ev.kind === "booking"
        ? ev.mine
          ? "bg-primary text-primary-foreground border border-primary"
          : "bg-muted text-muted-foreground border"
        : eventClasses[ev.kind];
    const hatch =
      ev.kind === "block"
        ? {
            backgroundImage:
              "repeating-linear-gradient(45deg, hsl(var(--muted)) 0, hsl(var(--muted)) 6px, transparent 6px, transparent 12px)",
          }
        : undefined;
    return (
      <div
        key={ev.key}
        className="pointer-events-none absolute overflow-hidden rounded-sm px-1 py-0.5"
        style={{
          top,
          height,
          left: `calc(${ev.lane * widthPct}% + 1px)`,
          width: `calc(${widthPct}% - 2px)`,
        }}
      >
        <div
          className={`relative h-full w-full overflow-hidden rounded-sm ${colour}`}
          style={hatch}
        >
          <div className="px-1 py-0.5 text-[10px] leading-tight">
            <div className="truncate font-medium">
              {minToHHmm(ev.start)} {ev.label}
            </div>
            {ev.sub && height > 28 && (
              <div className="truncate opacity-80">{ev.sub}</div>
            )}
          </div>
          {removable && (
            <button
              type="button"
              onClick={() =>
                ev.kind === "staged"
                  ? removeStaged(ev.stagedIdx!)
                  : handleRemoveExisting(ev.slotId!)
              }
              disabled={isRemoving}
              className="pointer-events-auto absolute right-0.5 top-0.5 rounded-sm bg-black/10 p-0.5 hover:bg-black/20"
              aria-label="Remove block"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1200px] flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Schedule {vendorName}</DialogTitle>
          <DialogDescription>
            {view === "calendar"
              ? `Click an empty slot to reserve time for this query. Existing bookings show what ${vendorName}'s time is taken up by — you can double-book by clicking beside one. Only future times can be booked.`
              : `Pick a free window (or set a custom time) to reserve time for this query. Existing bookings show what ${vendorName}'s time is taken up by. Only future times can be booked.`}
          </DialogDescription>
        </DialogHeader>

        {/* Week navigation + view toggle */}
        <div className="flex items-center justify-between gap-2">
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
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              <Button
                type="button"
                variant={view === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setView("calendar")}
                aria-label="Calendar view"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setWeekStart(
                  format(
                    addDays(parseISO(weekStart), DAYS_IN_VIEW),
                    "yyyy-MM-dd",
                  ),
                )
              }
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto rounded-md border">
          {isFetching && days.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading calendar…
            </div>
          ) : days.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No schedule data for this week.
            </p>
          ) : view === "calendar" ? (
            <div className="min-w-[760px]">
              {/* Day header */}
              <div className="sticky top-0 z-20 flex border-b bg-background">
                <div style={{ width: GUTTER_PX }} className="shrink-0" />
                {days.map((day) => {
                  const isToday = day.date === today;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 border-l py-1 text-center"
                    >
                      <div className="text-[11px] uppercase text-muted-foreground">
                        {format(parseISO(day.date), "EEE")}
                      </div>
                      <div
                        className={`text-sm ${
                          isToday
                            ? "mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
                            : "font-medium"
                        }`}
                      >
                        {format(parseISO(day.date), "d")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Body: time gutter + day columns */}
              <div className="flex">
                <div style={{ width: GUTTER_PX }} className="shrink-0">
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{ height: HOUR_PX }}
                      className="relative"
                    >
                      <span className="absolute -top-2 right-1 text-[10px] text-muted-foreground">
                        {h > startHour ? hourLabel(h) : ""}
                      </span>
                    </div>
                  ))}
                </div>

                {days.map((day) => {
                  const past = isPastDay(day.date);
                  const nonWorking =
                    !day.workingDay && day.freeWindows.length === 0;
                  const wsMin = day.workingHoursStart
                    ? hmToMin(day.workingHoursStart)
                    : null;
                  const weMin = day.workingHoursEnd
                    ? hmToMin(day.workingHoursEnd)
                    : null;
                  return (
                    <div
                      key={day.date}
                      className="relative flex-1 border-l"
                      style={{ height: gridHeight }}
                    >
                      {/* Clickable hour cells (define height; capture create clicks) */}
                      <div
                        className={past ? "cursor-default" : "cursor-pointer"}
                        onClick={(e) => handleColumnClick(day, e)}
                      >
                        {hours.map((h) => (
                          <div
                            key={h}
                            style={{ height: HOUR_PX }}
                            className="border-b border-muted/60"
                          />
                        ))}
                      </div>

                      {/* Outside-working-hours / non-working shading (hint only) */}
                      {nonWorking ? (
                        <div className="pointer-events-none absolute inset-0 bg-muted/30" />
                      ) : (
                        <>
                          {wsMin != null && wsMin > startMin && (
                            <div
                              className="pointer-events-none absolute inset-x-0 bg-muted/25"
                              style={{
                                top: 0,
                                height: ((wsMin - startMin) / 60) * HOUR_PX,
                              }}
                            />
                          )}
                          {weMin != null && weMin < endMin && (
                            <div
                              className="pointer-events-none absolute inset-x-0 bg-muted/25"
                              style={{
                                top: ((weMin - startMin) / 60) * HOUR_PX,
                                bottom: 0,
                              }}
                            />
                          )}
                        </>
                      )}

                      {/* Past overlay + now-line */}
                      {past && (
                        <div className="pointer-events-none absolute inset-0 bg-muted/40" />
                      )}
                      {day.date === today && nowMin > startMin && nowMin < endMin && (
                        <>
                          <div
                            className="pointer-events-none absolute inset-x-0 bg-muted/40"
                            style={{
                              top: 0,
                              height: ((nowMin - startMin) / 60) * HOUR_PX,
                            }}
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
                            style={{ top: ((nowMin - startMin) / 60) * HOUR_PX }}
                          />
                        </>
                      )}

                      {/* Events */}
                      {eventsForDay(day).map(renderEvent)}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {days.map((day) => {
                const past = isPastDay(day.date);
                const nonWorking =
                  !day.workingDay && day.freeWindows.length === 0;
                return (
                  <div
                    key={day.date}
                    className={`rounded-md border p-2 ${
                      day.date === selectedDate
                        ? "border-primary bg-primary/5"
                        : ""
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
                              if (day.date === today && we <= nowHHmm)
                                return null;
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
                            {day.bookings.map((b) => {
                              const mine = b.queryId === queryId;
                              const loc = locationLabel(b);
                              return (
                                <div
                                  key={b.id}
                                  className={`flex items-start justify-between gap-2 rounded-md border px-2 py-1 text-[11px] ${
                                    mine
                                      ? "border-primary/40 bg-primary/5"
                                      : "border-muted bg-muted/40 text-muted-foreground"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1 font-medium">
                                      <span>
                                        {toHHmm(b.startTime)}–{toHHmm(b.endTime)}
                                      </span>
                                      {mine && (
                                        <Badge
                                          variant="default"
                                          className="h-4 px-1 text-[9px]"
                                        >
                                          This query
                                        </Badge>
                                      )}
                                    </div>
                                    {b.queryTitle && (
                                      <div className="truncate">
                                        {b.queryTitle}
                                      </div>
                                    )}
                                    {loc && (
                                      <div className="flex items-center gap-1 truncate opacity-80">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {loc}
                                      </div>
                                    )}
                                  </div>
                                  {mine && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExisting(b.id)}
                                      disabled={isRemoving}
                                      className="shrink-0 rounded-sm hover:text-destructive"
                                      aria-label="Remove block"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Controls strip */}
        <div className="space-y-3">
          {selectedDate && (
            <div className="flex flex-wrap items-end gap-2 rounded-md border p-2">
              <span className="text-sm font-medium">
                New block · {format(parseISO(selectedDate), "EEE dd MMM")}
              </span>
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  step={300}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 w-[110px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  step={300}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 w-[110px]"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addBlock}
                disabled={!draftValid}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
              {draftOverlaps && (
                <Badge
                  variant="outline"
                  className="border-amber-400 text-[10px] text-amber-600"
                >
                  Double-booked
                </Badge>
              )}
              {!draftValid && startTime && endTime && (
                <span className="text-xs text-destructive">
                  {endTime <= startTime
                    ? "End must be after start."
                    : "Must be in the future."}
                </span>
              )}
            </div>
          )}

          {(staged.length > 0 || existingBlocks.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Blocks for this query:
              </span>
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
          )}

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for vendor (optional)"
            className="min-h-[44px]"
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
