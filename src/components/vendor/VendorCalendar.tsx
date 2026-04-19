import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type VendorScheduleSlot,
  useGetVendorScheduleQuery,
} from "@/store/api/vendorSchedule";

interface VendorCalendarProps {
  vendorId: string;
  /** Days to display starting from `from` (default: 14). */
  days?: number;
  from?: Date;
  /** Optional click handler (e.g. for the assign dialog). */
  onSlotClick?: (slot: VendorScheduleSlot) => void;
  /** When true, only AVAILABLE slots are clickable; others are dimmed. */
  selectableOnlyAvailable?: boolean;
  highlightSlotId?: string | null;
}

const STATUS_BADGE: Record<VendorScheduleSlot["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  AVAILABLE: { label: "Available", variant: "secondary" },
  BOOKED: { label: "Booked", variant: "default" },
  UNAVAILABLE: { label: "Unavailable", variant: "outline" },
};

const formatTime = (t: string | null): string => {
  if (!t) return "";
  // Backend returns HH:mm:ss
  const [h, m] = t.split(":");
  return `${h}:${m}`;
};

export const VendorCalendar = ({
  vendorId,
  days = 14,
  from,
  onSlotClick,
  selectableOnlyAvailable = false,
  highlightSlotId,
}: VendorCalendarProps) => {
  const [windowStart, setWindowStart] = useState<Date>(() => from ?? new Date());
  const windowEnd = useMemo(() => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + days - 1);
    return d;
  }, [windowStart, days]);

  const { data, isLoading } = useGetVendorScheduleQuery({
    vendorId,
    from: format(windowStart, "yyyy-MM-dd"),
    to: format(windowEnd, "yyyy-MM-dd"),
  });

  const slotsByDay = useMemo(() => {
    const grouped: Record<string, VendorScheduleSlot[]> = {};
    (data?.data ?? []).forEach((slot) => {
      grouped[slot.date] = grouped[slot.date] ?? [];
      grouped[slot.date].push(slot);
    });
    return grouped;
  }, [data?.data]);

  const dayCells = useMemo(() => {
    const out: { key: string; date: Date }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i);
      out.push({ key: format(d, "yyyy-MM-dd"), date: d });
    }
    return out;
  }, [windowStart, days]);

  const shift = (delta: number) => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + delta);
    setWindowStart(d);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>
            {format(windowStart, "MMM d")} – {format(windowEnd, "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => shift(-days)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => shift(days)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading schedule…</div>
      )}

      <div className="grid gap-2">
        {dayCells.map(({ key, date }) => {
          const daySlots = slotsByDay[key] ?? [];
          return (
            <div key={key} className="border rounded-md p-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {format(date, "EEE, MMM d")}
              </div>
              {daySlots.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No slots</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => {
                    const meta = STATUS_BADGE[slot.status];
                    const clickable =
                      onSlotClick &&
                      (!selectableOnlyAvailable || slot.status === "AVAILABLE");
                    return (
                      <button
                        type="button"
                        key={slot.id}
                        disabled={!clickable}
                        onClick={() => clickable && onSlotClick?.(slot)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded-md border text-xs transition-colors",
                          clickable
                            ? "hover:border-primary cursor-pointer"
                            : "cursor-default",
                          slot.status === "UNAVAILABLE" && "opacity-60",
                          highlightSlotId === slot.id && "border-primary bg-primary/10",
                        )}
                      >
                        <span className="font-medium">
                          {formatTime(slot.startTime)}
                          {slot.endTime ? ` – ${formatTime(slot.endTime)}` : ""}
                        </span>
                        <Badge variant={meta.variant} className="text-[10px] py-0">
                          {meta.label}
                        </Badge>
                        {slot.notes && (
                          <span className="text-muted-foreground truncate max-w-[120px]">
                            · {slot.notes}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorCalendar;
