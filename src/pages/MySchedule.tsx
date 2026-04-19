import { useState } from "react";
import { format } from "date-fns";
import Header from "@/components/Header";
import VendorCalendar from "@/components/vendor/VendorCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateVendorSlotsMutation,
  useGetMyAssignedQueriesQuery,
  useGetMyVendorProfileQuery,
  useUpdateVendorSlotMutation,
  type VendorScheduleSlot,
} from "@/store/api/vendorSchedule";

const MySchedule = () => {
  const { toast } = useToast();
  const { data: profileResp, isLoading: loadingProfile } = useGetMyVendorProfileQuery();
  const { data: queriesResp } = useGetMyAssignedQueriesQuery();
  const profile = profileResp?.data ?? null;
  const queries = queriesResp?.data ?? [];

  const [createSlots, { isLoading: creating }] = useCreateVendorSlotsMutation();
  const [updateSlot] = useUpdateVendorSlotMutation();

  const [editSlot, setEditSlot] = useState<VendorScheduleSlot | null>(null);
  const [editStatus, setEditStatus] = useState<VendorScheduleSlot["status"]>("AVAILABLE");
  const [editNotes, setEditNotes] = useState("");

  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("12:00");
  const [newNotes, setNewNotes] = useState("");
  const [addSlotOpen, setAddSlotOpen] = useState(false);

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

  const handleAddSlot = async () => {
    if (!newStart || !newEnd) {
      toast({ title: "Missing time", description: "Provide a start and end time." });
      return;
    }
    try {
      await createSlots({
        vendorId: profile.id,
        body: {
          slots: [
            {
              date: newDate,
              startTime: `${newStart}:00`,
              endTime: `${newEnd}:00`,
              status: "AVAILABLE",
              notes: newNotes || undefined,
            },
          ],
        },
      }).unwrap();
      toast({ title: "Slot added" });
      setAddSlotOpen(false);
      setNewNotes("");
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Could not create slot",
        variant: "destructive",
      });
    }
  };

  const openEdit = (slot: VendorScheduleSlot) => {
    setEditSlot(slot);
    setEditStatus(slot.status);
    setEditNotes(slot.notes ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editSlot) return;
    try {
      await updateSlot({
        slotId: editSlot.id,
        vendorId: profile.id,
        body: {
          status: editStatus !== editSlot.status ? editStatus : undefined,
          notes: editNotes,
        },
      }).unwrap();
      toast({ title: "Slot updated" });
      setEditSlot(null);
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Could not update slot",
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>{profile.name}</CardTitle>
                <CardDescription>
                  {profile.specializations
                    ? `Specializations: ${profile.specializations}`
                    : "No specializations on file"}
                </CardDescription>
              </div>
              <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
                <DialogTrigger asChild>
                  <Button>Add availability</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New availability slot</DialogTitle>
                    <DialogDescription>
                      Customer Support will see this when assigning queries.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Start</Label>
                      <Input
                        type="time"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>End</Label>
                      <Input
                        type="time"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddSlotOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSlot} disabled={creating}>
                      {creating ? "Saving…" : "Add slot"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>
              Tap a slot to mark it unavailable or update notes. Booked slots can be released only by support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VendorCalendar vendorId={profile.id} onSlotClick={openEdit} />
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
              <div key={q.id} className="border rounded-md p-3 text-sm">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium">{q.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {q.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {q.dueDate ? `Due ${q.dueDate}` : "No due date"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {q.customerName ?? "Unknown customer"} · {q.customerAddress ?? ""} {q.customerCity ?? ""}
                </div>
                {q.status?.name && (
                  <div className="text-xs text-muted-foreground mt-1">Status: {q.status.name}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editSlot} onOpenChange={(o) => !o && setEditSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update slot</DialogTitle>
            <DialogDescription>
              {editSlot?.status === "BOOKED"
                ? "This slot is booked. You can update notes only."
                : "Change availability or add a note."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as VendorScheduleSlot["status"])}
                disabled={editSlot?.status === "BOOKED"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlot(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySchedule;
