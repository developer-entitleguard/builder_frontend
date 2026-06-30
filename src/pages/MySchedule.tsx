import { useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Trash2,
} from "lucide-react";
import {
  useCreateVendorSlotsMutation,
  useDeleteVendorSlotMutation,
  useGetMyAssignedQueriesQuery,
  useGetMyVendorProfileQuery,
  useGetVendorScheduleQuery,
  useUpdateMyWorkingScheduleMutation,
  type VendorDayAvailability,
} from "@/store/api/vendorSchedule";
import VendorJobCalendar from "@/components/schedule/VendorJobCalendar";

const ALL_WEEKDAYS: { iso: number; short: string; label: string }[] = [
  { iso: 1, short: "Mon", label: "Monday" },
  { iso: 2, short: "Tue", label: "Tuesday" },
  { iso: 3, short: "Wed", label: "Wednesday" },
  { iso: 4, short: "Thu", label: "Thursday" },
  { iso: 5, short: "Fri", label: "Friday" },
  { iso: 6, short: "Sat", label: "Saturday" },
  { iso: 7, short: "Sun", label: "Sunday" },
];

const parseWeekdays = (csv: string | null | undefined): number[] => {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
};

const weekdayLabel = (isoNumbers: number[]): string => {
  if (isoNumbers.length === 0) return "—";
  const set = new Set(isoNumbers);
  // Friendly shorthand: consecutive Mon–Fri → "Mon–Fri"; everything else → "Mon, Wed, Fri".
  if (set.has(1) && set.has(2) && set.has(3) && set.has(4) && set.has(5) && !set.has(6) && !set.has(7)) {
    return "Mon–Fri";
  }
  return ALL_WEEKDAYS.filter((d) => set.has(d.iso))
    .map((d) => d.short)
    .join(", ");
};

const toHHmm = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  return `${h?.padStart(2, "0") ?? ""}:${m?.padStart(2, "0") ?? ""}`;
};

const WINDOW_DAYS = 14;

const MySchedule = () => {
  const { toast } = useToast();
  const { data: profileResp, isLoading: loadingProfile } = useGetMyVendorProfileQuery();
  const { data: queriesResp } = useGetMyAssignedQueriesQuery();
  const profile = profileResp?.data ?? null;
  const queries = queriesResp?.data ?? [];

  const [windowStart, setWindowStart] = useState<Date>(() => new Date());
  const windowEnd = useMemo(() => addDays(windowStart, WINDOW_DAYS - 1), [windowStart]);

  const { data: scheduleResp, isFetching: loadingSchedule } = useGetVendorScheduleQuery(
    {
      vendorId: profile?.id ?? "",
      from: format(windowStart, "yyyy-MM-dd"),
      to: format(windowEnd, "yyyy-MM-dd"),
    },
    { skip: !profile?.id },
  );
  const days: VendorDayAvailability[] = scheduleResp?.data ?? [];

  const [createSlots, { isLoading: creating }] = useCreateVendorSlotsMutation();
  const [deleteSlot, { isLoading: releasing }] = useDeleteVendorSlotMutation();
  const [updateWorkingSchedule, { isLoading: savingSchedule }] = useUpdateMyWorkingScheduleMutation();

  // --- Working schedule dialog state ---
  const orgDefaultStart = profile?.builderOrganization?.workingHoursStart ?? null;
  const orgDefaultEnd = profile?.builderOrganization?.workingHoursEnd ?? null;
  const vendorOverrideStart = profile?.workingHoursStart ?? null;
  const vendorOverrideEnd = profile?.workingHoursEnd ?? null;
  const vendorOverrideWeekdays = parseWeekdays(profile?.workingWeekdays);
  const effectiveStart = vendorOverrideStart ?? orgDefaultStart ?? "09:00:00";
  const effectiveEnd = vendorOverrideEnd ?? orgDefaultEnd ?? "18:00:00";
  const effectiveWeekdays = vendorOverrideWeekdays.length > 0 ? vendorOverrideWeekdays : [1, 2, 3, 4, 5];
  const usingOrgDefaults =
    vendorOverrideStart === null && vendorOverrideEnd === null && vendorOverrideWeekdays.length === 0;

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [formStart, setFormStart] = useState<string>(toHHmm(effectiveStart));
  const [formEnd, setFormEnd] = useState<string>(toHHmm(effectiveEnd));
  const [formDays, setFormDays] = useState<number[]>(effectiveWeekdays);

  // --- Block-time dialog state ---
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDate, setBlockDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockNotes, setBlockNotes] = useState("");

  // Sampled from the server-computed day list — used later to show the org
  // default hours as a fallback label when the vendor has no override.
  const sampleDay = days.find((d) => d.workingDay) ?? days[0];

  if (loadingProfile) {
    return (
      <div>
        <Header />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <Header />
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No vendor profile linked</CardTitle>
              <CardDescription>
                Ask an administrator to link your user account to a vendor record under Admin → Vendors.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const shiftWindow = (deltaDays: number) => setWindowStart((prev) => addDays(prev, deltaDays));

  const handleCreateBlock = async () => {
    if (!blockDate) {
      toast({ title: "Pick a date" });
      return;
    }
    const start = blockAllDay ? toHHmm(sampleDay?.workingHoursStart) || "09:00" : blockStart;
    const end = blockAllDay ? toHHmm(sampleDay?.workingHoursEnd) || "18:00" : blockEnd;
    if (end <= start) {
      toast({ title: "End time must be after start", variant: "destructive" });
      return;
    }
    try {
      await createSlots({
        vendorId: profile.id,
        body: {
          slots: [
            {
              date: blockDate,
              startTime: `${start}:00`,
              endTime: `${end}:00`,
              status: "UNAVAILABLE",
              notes: blockNotes || undefined,
            },
          ],
        },
      }).unwrap();
      toast({ title: "Time blocked off" });
      setBlockOpen(false);
      setBlockNotes("");
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Could not block time",
        variant: "destructive",
      });
    }
  };

  const handleRemoveBlock = async (slotId: string) => {
    if (!window.confirm("Remove this time block?")) return;
    try {
      await deleteSlot({ slotId, vendorId: profile.id }).unwrap();
      toast({ title: "Block removed" });
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Could not remove block",
        variant: "destructive",
      });
    }
  };

  const openScheduleEditor = () => {
    setFormStart(toHHmm(effectiveStart));
    setFormEnd(toHHmm(effectiveEnd));
    setFormDays(effectiveWeekdays);
    setScheduleOpen(true);
  };

  const handleToggleDay = (iso: number) => {
    setFormDays((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()
    );
  };

  const handleSaveSchedule = async () => {
    if (!formStart || !formEnd) {
      toast({ title: "Pick a start and end time", variant: "destructive" });
      return;
    }
    if (formEnd <= formStart) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }
    if (formDays.length === 0) {
      toast({ title: "Pick at least one working day", variant: "destructive" });
      return;
    }
    try {
      await updateWorkingSchedule({
        workingHoursStart: `${formStart}:00`,
        workingHoursEnd: `${formEnd}:00`,
        workingWeekdays: [...formDays].sort(),
      }).unwrap();
      toast({ title: "Working schedule updated" });
      setScheduleOpen(false);
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Could not update schedule",
        variant: "destructive",
      });
    }
  };

  const handleResetToOrgDefault = async () => {
    if (!window.confirm("Reset to the organisation default working schedule?")) return;
    try {
      await updateWorkingSchedule({
        workingHoursStart: null,
        workingHoursEnd: null,
        workingWeekdays: null,
      }).unwrap();
      toast({ title: "Using organisation default now" });
      setScheduleOpen(false);
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Could not reset",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Header />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              My jobs
            </CardTitle>
            <CardDescription>
              Your scheduled jobs this week. Drag a job to reschedule it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VendorJobCalendar vendorId={profile.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle>{profile.name}</CardTitle>
                <CardDescription>
                  You're available by default on the days + hours below — only block off time you can't take work.
                </CardDescription>
                {profile.specializations && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Specializations: {profile.specializations}
                  </p>
                )}
              </div>
              <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <CalendarOff className="h-4 w-4 mr-2" />
                    Block time off
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Block time off</DialogTitle>
                    <DialogDescription>
                      Customer Support won't be able to assign queries in this window.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={blockDate}
                        onChange={(e) => setBlockDate(e.target.value)}
                      />
                    </div>
                    <label className="col-span-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={blockAllDay}
                        onChange={(e) => setBlockAllDay(e.target.checked)}
                      />
                      Block the whole working day
                    </label>
                    {!blockAllDay && (
                      <>
                        <div>
                          <Label>Start</Label>
                          <Input
                            type="time"
                            step={300}
                            value={blockStart}
                            onChange={(e) => setBlockStart(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>End</Label>
                          <Input
                            type="time"
                            step={300}
                            value={blockEnd}
                            onChange={(e) => setBlockEnd(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <Label>Reason (optional)</Label>
                      <Textarea
                        value={blockNotes}
                        onChange={(e) => setBlockNotes(e.target.value)}
                        className="min-h-[60px]"
                        placeholder="e.g. Dentist appointment"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateBlock} disabled={creating}>
                      {creating ? "Saving…" : "Block time"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Your working schedule
                </CardTitle>
                <CardDescription>
                  {usingOrgDefaults
                    ? "Using organisation default. Change it if you work different days or hours."
                    : "Personal schedule — differs from organisation default."}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={openScheduleEditor}>
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Working days</p>
                <p className="font-medium">{weekdayLabel(effectiveWeekdays)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Working hours</p>
                <p className="font-medium">
                  {toHHmm(effectiveStart)} – {toHHmm(effectiveEnd)}
                </p>
              </div>
              {!usingOrgDefaults && orgDefaultStart && orgDefaultEnd && (
                <p className="md:col-span-2 text-xs text-muted-foreground">
                  Organisation default: {weekdayLabel([1, 2, 3, 4, 5])},{" "}
                  {toHHmm(orgDefaultStart)} – {toHHmm(orgDefaultEnd)}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Always-visible list of blocks so the Remove button is discoverable
            even on days we might otherwise hide (weekends, etc). */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" /> Upcoming time off
            </CardTitle>
            <CardDescription>
              Blocks you've set for the next {WINDOW_DAYS} days. Click Remove to clear one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingSchedule && <Skeleton className="h-16" />}
            {!loadingSchedule && days.every((d) => d.blocks.length === 0) && (
              <p className="text-sm text-muted-foreground">No time off scheduled.</p>
            )}
            {days
              .flatMap((d) =>
                d.blocks.map((b) => ({
                  block: b,
                  dateLabel: format(new Date(`${d.date}T00:00:00`), "EEE, MMM d"),
                })),
              )
              .map(({ block, dateLabel }) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between border rounded-md p-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {dateLabel} · {toHHmm(block.startTime)}–{toHHmm(block.endTime)}
                    </p>
                    {block.notes && (
                      <p className="text-xs text-muted-foreground">{block.notes}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={releasing}
                    onClick={() => handleRemoveBlock(block.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" /> Next {WINDOW_DAYS} days
                </CardTitle>
                <CardDescription>
                  {format(windowStart, "MMM d")} – {format(windowEnd, "MMM d, yyyy")}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => shiftWindow(-WINDOW_DAYS)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => shiftWindow(WINDOW_DAYS)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingSchedule && <Skeleton className="h-24" />}
            {!loadingSchedule &&
              days.map((day) => (
                <div key={day.date} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(`${day.date}T00:00:00`), "EEE, MMM d")}
                      </p>
                      {day.workingDay ? (
                        <p className="text-xs text-muted-foreground">
                          Working hours {toHHmm(day.workingHoursStart)} – {toHHmm(day.workingHoursEnd)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Weekend — not working</p>
                      )}
                    </div>
                  </div>

                  {day.workingDay && (
                    <div className="flex flex-wrap gap-2">
                      {day.freeWindows.length === 0 &&
                        day.blocks.length === 0 &&
                        day.bookings.length === 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            Fully available
                          </Badge>
                        )}
                      {day.freeWindows.map((w, i) => (
                        <Badge
                          key={`free-${i}`}
                          variant="secondary"
                          className="text-[10px] flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {toHHmm(w.startTime)}–{toHHmm(w.endTime)}
                        </Badge>
                      ))}
                      {day.bookings.map((b) => (
                        <Badge
                          key={b.id}
                          variant="default"
                          className="text-[10px] flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" />
                          Booked {toHHmm(b.startTime)}–{toHHmm(b.endTime)}
                        </Badge>
                      ))}
                      {day.blocks.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] text-destructive border-destructive/40 bg-destructive/5"
                        >
                          <CalendarOff className="h-3 w-3" />
                          Blocked {toHHmm(b.startTime)}–{toHHmm(b.endTime)}
                          {b.notes ? ` · ${b.notes}` : ""}
                          <button
                            type="button"
                            className="ml-1 hover:text-destructive/70 disabled:opacity-40"
                            disabled={releasing}
                            onClick={() => handleRemoveBlock(b.id)}
                            aria-label="Remove block"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My queries ({queries.length})</CardTitle>
            <CardDescription>Open work assigned to you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {queries.length === 0 && (
              <p className="text-sm text-muted-foreground">No queries assigned.</p>
            )}
            {queries.map((q) => (
              <Link
                key={q.id}
                to={`/my-assignments/${q.id}`}
                className="block border rounded-md p-3 text-sm hover:border-primary transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium">{q.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {q.dueDate ? `Due ${q.dueDate}` : "No due date"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {q.customerName ?? "Unknown customer"} · {q.customerAddress ?? ""}{" "}
                  {q.customerCity ?? ""}
                </div>
                {q.status?.name && (
                  <div className="text-xs text-muted-foreground mt-1">Status: {q.status.name}</div>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit working schedule</DialogTitle>
            <DialogDescription>
              Pick the days and hours you'd usually work. Customer Support will only assign queries inside these windows unless you block time off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Working days</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_WEEKDAYS.map((d) => {
                  const checked = formDays.includes(d.iso);
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => handleToggleDay(d.iso)}
                      className={`px-3 py-1 rounded-md border text-xs transition-colors ${
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:border-primary"
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tap a day to include or exclude it from your default schedule.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  step={300}
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  step={300}
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
            </div>
            {usingOrgDefaults && orgDefaultStart && orgDefaultEnd && (
              <p className="text-xs text-muted-foreground">
                Current org default: Mon–Fri, {toHHmm(orgDefaultStart)} – {toHHmm(orgDefaultEnd)}.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            {!usingOrgDefaults && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetToOrgDefault}
                disabled={savingSchedule}
              >
                Reset to org default
              </Button>
            )}
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} disabled={savingSchedule}>
              {savingSchedule ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySchedule;
