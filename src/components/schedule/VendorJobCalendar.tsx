import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVendorScheduleQuery,
  useMoveMyBookedSlotMutation,
  type VendorDayAvailability,
} from "@/store/api/vendorSchedule";
import {
  DAYS_IN_VIEW,
  HOUR_PX,
  GUTTER_PX,
  DRAG_SNAP_MIN,
  toHHmm,
  hmToMin,
  minToHHmm,
  hourLabel,
  locationLabel,
  layoutDay,
} from "@/components/schedule/timeGrid";

interface VendorJobCalendarProps {
  vendorId: string;
}

interface VEvent {
  key: string;
  date: string;
  start: number;
  end: number;
  kind: "booking" | "block";
  label: string;
  sub?: string;
  slotId?: string;
  dragging?: boolean;
  lane: number;
  laneCount: number;
}

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  mode: DragMode;
  slotId: string;
  label: string;
  sub?: string;
  origStart: number;
  origEnd: number;
  origDate: string;
  startX: number;
  startY: number;
  cols: Array<{ date: string; left: number; right: number }>;
}

/**
 * The internal vendor's own week calendar: their booked jobs across days, shown
 * as positioned blocks they can drag to move/resize (reschedule). Time-off is
 * shown read-only for context. Vendors can move time but never delete a job;
 * the server forbids moving into the past or once a job is completed. Reuses the
 * shared time-grid primitives (and the same optimistic move/rollback as the
 * builder grid).
 */
const VendorJobCalendar = ({ vendorId }: VendorJobCalendarProps) => {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const nowHHmm = format(new Date(), "HH:mm");
  const nowMin = hmToMin(nowHHmm);

  const [weekStart, setWeekStart] = useState<string>(today);
  const [optimistic, setOptimistic] = useState<
    Record<string, { date: string; start: number; end: number }>
  >({});

  const weekEnd = useMemo(
    () => format(addDays(parseISO(weekStart), DAYS_IN_VIEW - 1), "yyyy-MM-dd"),
    [weekStart],
  );

  const { data: scheduleResp, isFetching } = useGetVendorScheduleQuery(
    { vendorId, from: weekStart, to: weekEnd },
    { skip: !vendorId },
  );
  const days: VendorDayAvailability[] = useMemo(
    () => scheduleResp?.data ?? [],
    [scheduleResp],
  );
  const allBookings = useMemo(() => days.flatMap((d) => d.bookings), [days]);

  const [moveMyBookedSlot] = useMoveMyBookedSlotMutation();

  const gridBodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<{ date: string; start: number; end: number } | null>(
    null,
  );
  const [preview, setPreview] = useState<{
    date: string;
    start: number;
    end: number;
  } | null>(null);

  // Apply any optimistic reschedule override so a moved block renders in place.
  const effectiveBooking = (
    b: VendorDayAvailability["bookings"][number],
  ): { date: string; start: number; end: number } => {
    const o = optimistic[b.id];
    return o
      ? o
      : { date: b.date, start: hmToMin(b.startTime), end: hmToMin(b.endTime) };
  };

  // Drop an override once the refetched data matches it.
  useEffect(() => {
    setOptimistic((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      allBookings.forEach((b) => {
        const o = next[b.id];
        if (
          o &&
          b.startTime &&
          b.endTime &&
          b.date === o.date &&
          hmToMin(b.startTime) === o.start &&
          hmToMin(b.endTime) === o.end
        ) {
          delete next[b.id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [allBookings]);

  const isPastDay = (date: string) =>
    isBefore(startOfDay(parseISO(date)), startOfDay(parseISO(today)));

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
    const sh = Math.max(0, Math.floor(minM / 60));
    const eh = Math.min(24, Math.ceil(maxM / 60));
    const safeEh = eh > sh ? eh : sh + 1;
    return {
      startHour: sh,
      endHour: safeEh,
      hours: Array.from({ length: safeEh - sh }, (_, i) => sh + i),
      gridHeight: (safeEh - sh) * HOUR_PX,
    };
  }, [days]);

  const startMin = startHour * 60;
  const endMin = endHour * 60;

  const eventsForDay = (day: VendorDayAvailability): VEvent[] => {
    const dr = dragRef.current;
    const raw: Omit<VEvent, "lane" | "laneCount">[] = [];
    allBookings.forEach((b) => {
      if (!b.startTime || !b.endTime) return;
      const eff = effectiveBooking(b);
      if (eff.date !== day.date) return;
      if (dr && dr.slotId === b.id) return; // dragging — shown as ghost
      raw.push({
        key: `bk-${b.id}`,
        date: day.date,
        start: eff.start,
        end: eff.end,
        kind: "booking",
        label: b.queryTitle || "Job",
        sub: locationLabel(b),
        slotId: b.id,
      });
    });
    day.blocks.forEach((b) => {
      if (!b.startTime || !b.endTime) return;
      raw.push({
        key: `bl-${b.id}`,
        date: day.date,
        start: hmToMin(b.startTime),
        end: hmToMin(b.endTime),
        kind: "block",
        label: b.notes || "Time off",
      });
    });
    if (dr && preview && preview.date === day.date) {
      raw.push({
        key: "preview",
        date: day.date,
        start: preview.start,
        end: preview.end,
        kind: "booking",
        label: dr.label,
        sub: dr.sub,
        slotId: dr.slotId,
        dragging: true,
      });
    }
    return layoutDay(raw);
  };

  const commitDrag = (
    d: DragState | null,
    p: { date: string; start: number; end: number } | null,
  ) => {
    if (!d || !p) return;
    if (p.date === d.origDate && p.start === d.origStart && p.end === d.origEnd)
      return;
    if (p.date < today || (p.date === today && minToHHmm(p.start) <= nowHHmm)) {
      toast({ title: "Can't schedule in the past", variant: "destructive" });
      return;
    }
    const slotId = d.slotId;
    setOptimistic((prev) => ({
      ...prev,
      [slotId]: { date: p.date, start: p.start, end: p.end },
    }));
    const rollback = () =>
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
    moveMyBookedSlot({
      slotId,
      vendorId,
      date: p.date,
      startTime: `${minToHHmm(p.start)}:00`,
      endTime: `${minToHHmm(p.end)}:00`,
    })
      .unwrap()
      .then((res) => {
        if (!res.success) {
          rollback();
          toast({
            title: "Couldn't move job",
            description: res.message,
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        rollback();
        toast({
          title: "Couldn't move job",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      });
  };

  const beginDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    ev: VEvent,
    mode: DragMode,
  ) => {
    if (!ev.slotId) return;
    e.preventDefault();
    e.stopPropagation();
    const cols = gridBodyRef.current
      ? Array.from(
          gridBodyRef.current.querySelectorAll<HTMLElement>("[data-daycol]"),
        ).map((el) => {
          const r = el.getBoundingClientRect();
          return { date: el.dataset.date ?? "", left: r.left, right: r.right };
        })
      : [];
    dragRef.current = {
      mode,
      slotId: ev.slotId,
      label: ev.label,
      sub: ev.sub,
      origStart: ev.start,
      origEnd: ev.end,
      origDate: ev.date,
      startX: e.clientX,
      startY: e.clientY,
      cols,
    };
    previewRef.current = { date: ev.date, start: ev.start, end: ev.end };
    setPreview(previewRef.current);

    const onMove = (me: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dyMin =
        Math.round((((me.clientY - cur.startY) / HOUR_PX) * 60) / DRAG_SNAP_MIN) *
        DRAG_SNAP_MIN;
      let date = cur.origDate;
      let start = cur.origStart;
      let end = cur.origEnd;
      if (cur.mode === "move") {
        let shift = dyMin;
        if (cur.origStart + shift < startMin) shift = startMin - cur.origStart;
        if (cur.origEnd + shift > endMin) shift = endMin - cur.origEnd;
        start = cur.origStart + shift;
        end = cur.origEnd + shift;
        const col = cur.cols.find(
          (c) => me.clientX >= c.left && me.clientX < c.right,
        );
        if (col && col.date) date = col.date;
      } else if (cur.mode === "resize-start") {
        start = Math.min(
          Math.max(cur.origStart + dyMin, startMin),
          cur.origEnd - DRAG_SNAP_MIN,
        );
        end = cur.origEnd;
      } else {
        end = Math.max(
          Math.min(cur.origEnd + dyMin, endMin),
          cur.origStart + DRAG_SNAP_MIN,
        );
        start = cur.origStart;
      }
      previewRef.current = { date, start, end };
      setPreview(previewRef.current);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const d2 = dragRef.current;
      const p2 = previewRef.current;
      dragRef.current = null;
      previewRef.current = null;
      setPreview(null);
      commitDrag(d2, p2);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const prevDisabled = weekStart === today;

  const renderEvent = (ev: VEvent) => {
    const top = ((ev.start - startMin) / 60) * HOUR_PX;
    const height = Math.max(((ev.end - ev.start) / 60) * HOUR_PX, 16);
    const widthPct = 100 / ev.laneCount;
    const editable = ev.kind === "booking";
    const colour =
      ev.kind === "booking"
        ? "bg-primary text-primary-foreground border border-primary"
        : "border border-muted-foreground/30 text-muted-foreground";
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
        onPointerDown={editable ? (e) => beginDrag(e, ev, "move") : undefined}
        className={`absolute overflow-hidden rounded-sm px-1 py-0.5 ${
          editable
            ? "cursor-move touch-none select-none"
            : "pointer-events-none"
        } ${ev.dragging ? "z-30 opacity-90" : ""}`}
        style={{
          top,
          height,
          left: `calc(${ev.lane * widthPct}% + 1px)`,
          width: `calc(${widthPct}% - 2px)`,
          pointerEvents: editable ? "auto" : "none",
        }}
      >
        <div
          className={`relative h-full w-full overflow-hidden rounded-sm ${colour} ${
            ev.dragging ? "ring-2 ring-primary" : ""
          }`}
          style={hatch}
        >
          {editable && (
            <>
              <div
                onPointerDown={(e) => beginDrag(e, ev, "resize-start")}
                className="pointer-events-auto absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize"
                aria-hidden="true"
              />
              <div
                onPointerDown={(e) => beginDrag(e, ev, "resize-end")}
                className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
                aria-hidden="true"
              />
            </>
          )}
          <div className="px-1 py-0.5 text-[10px] leading-tight">
            <div className="truncate font-medium">
              {minToHHmm(ev.start)} {ev.label}
            </div>
            {ev.sub && height > 28 && (
              <div className="truncate opacity-80">{ev.sub}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
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

      <p className="text-xs text-muted-foreground">
        Drag a job to move it, or drag its top/bottom edge to resize. Only future
        times can be booked, and completed jobs can't be moved.
      </p>

      {/* Calendar grid */}
      <div className="max-h-[460px] overflow-auto rounded-md border">
        {isFetching && days.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading calendar…
          </div>
        ) : days.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No schedule data for this week.
          </p>
        ) : (
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
            <div className="flex" ref={gridBodyRef}>
              <div style={{ width: GUTTER_PX }} className="shrink-0">
                {hours.map((h) => (
                  <div key={h} style={{ height: HOUR_PX }} className="relative">
                    <span className="absolute -top-2 right-1 text-[10px] text-muted-foreground">
                      {h > startHour ? hourLabel(h) : ""}
                    </span>
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const past = isPastDay(day.date);
                const wsMin = day.workingHoursStart
                  ? hmToMin(day.workingHoursStart)
                  : null;
                const weMin = day.workingHoursEnd
                  ? hmToMin(day.workingHoursEnd)
                  : null;
                const nonWorking =
                  !day.workingDay && day.freeWindows.length === 0;
                return (
                  <div
                    key={day.date}
                    data-daycol
                    data-date={day.date}
                    className="relative flex-1 border-l"
                    style={{ height: gridHeight }}
                  >
                    <div>
                      {hours.map((h) => (
                        <div
                          key={h}
                          style={{ height: HOUR_PX }}
                          className="border-b border-muted/60"
                        />
                      ))}
                    </div>

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

                    {past && (
                      <div className="pointer-events-none absolute inset-0 bg-muted/40" />
                    )}
                    {day.date === today &&
                      nowMin > startMin &&
                      nowMin < endMin && (
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
                            style={{
                              top: ((nowMin - startMin) / 60) * HOUR_PX,
                            }}
                          />
                        </>
                      )}

                    {eventsForDay(day).map(renderEvent)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorJobCalendar;
