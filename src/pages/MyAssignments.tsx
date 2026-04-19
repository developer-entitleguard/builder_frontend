import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGetMyAssignedQueriesQuery, type MyAssignedQuery } from "@/store/api/vendorSchedule";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";
import { useUpdateQueryMutation } from "@/lib/api/services/query";

const ALLOWED_NEXT_STATUSES = ["IN_PROGRESS", "ON_HOLD", "DONE"];

const MyAssignments = () => {
  const { toast } = useToast();
  const { data: queriesResp, refetch } = useGetMyAssignedQueriesQuery();
  const { data: statusesResp } = useGetStatusesByModuleQuery({ module: "QUERY" }, { skip: false });
  const [updateQuery, { isLoading: updating }] = useUpdateQueryMutation();

  const [active, setActive] = useState<MyAssignedQuery | null>(null);
  const [nextStatusId, setNextStatusId] = useState<string>("");
  const [comment, setComment] = useState("");

  const queries = queriesResp?.data ?? [];
  const statuses = statusesResp?.data ?? [];

  const allowedStatuses = useMemo(
    () =>
      statuses.filter((s) =>
        ALLOWED_NEXT_STATUSES.includes(s.name.toUpperCase().replace(/\s+/g, "_"))
      ),
    [statuses]
  );

  const openUpdate = (q: MyAssignedQuery) => {
    setActive(q);
    setNextStatusId("");
    setComment("");
  };

  const handleSubmit = async () => {
    if (!active || !nextStatusId) {
      toast({ title: "Pick a status" });
      return;
    }
    try {
      await updateQuery({ id: active.id, statusId: nextStatusId }).unwrap();
      toast({ title: "Status updated" });
      setActive(null);
      refetch();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Header />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>My assignments ({queries.length})</CardTitle>
            <CardDescription>
              Open queries assigned to you. Update status as you make progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queries.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing assigned right now.</p>
            )}
            {queries.map((q) => (
              <div key={q.id} className="border rounded-md p-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{q.title}</p>
                      {q.priorityLevel && (
                        <Badge variant="outline" className="text-[10px]">
                          {q.priorityLevel}
                        </Badge>
                      )}
                      {q.status?.name && (
                        <Badge variant="secondary" className="text-[10px]">
                          {q.status.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{q.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {q.customerName} · {q.customerAddress} {q.customerCity} {q.customerState} {q.customerZip}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contact: {q.customerContact ?? "—"} · {q.customerEmail ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {q.dueDate && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Due {q.dueDate}
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openUpdate(q)}>
                      Update status
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update query status</DialogTitle>
            <DialogDescription>{active?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Next status</Label>
              <Select value={nextStatusId} onValueChange={setNextStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a status" />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Stored for the support team if you want to add context"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updating || !nextStatusId}>
              {updating ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAssignments;
