import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useOrganization } from "@/hooks/useOrganization";
import { useListTicketsQuery, type Ticket } from "@/store/api/tickets";

const PRIORITY_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

const STATUS_VARIANT: Record<Ticket["status"], "default" | "destructive" | "outline" | "secondary"> = {
  NEW: "default",
  TRIAGED: "secondary",
  CONVERTED: "outline",
  CLOSED: "outline",
  CANCELLED: "destructive",
};

const TicketsTriage = () => {
  const { effectiveOrganization } = useOrganization();
  const builderId = effectiveOrganization?.id;

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);

  const showClosedOrCancelled =
    includeClosed || statusFilter === "CLOSED" || statusFilter === "CANCELLED";

  const { data, isLoading } = useListTicketsQuery(
    {
      builderId: builderId ?? "",
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      includeClosed: showClosedOrCancelled,
    },
    { skip: !builderId },
  );

  const filtered = useMemo(() => {
    const all = data?.data ?? [];
    if (!search.trim()) return all;
    const needle = search.toLowerCase();
    return all.filter((t) =>
      [t.customerName, t.customerEmail, t.customerPhone, t.description, t.category]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle))
    );
  }, [data?.data, search]);

  return (
    <div>
      <Header />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Ticket triage</h1>
          <p className="text-sm text-muted-foreground">
            Customer inquiries from EG-Receptionist. Link to a registration and convert to a query.
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Search name, email, phone, description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="TRIAGED">Triaged</SelectItem>
                  <SelectItem value="CONVERTED">Converted</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter || "ALL"} onValueChange={(v) => setPriorityFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="include-closed"
                checked={includeClosed}
                onCheckedChange={setIncludeClosed}
                disabled={statusFilter === "CLOSED" || statusFilter === "CANCELLED"}
              />
              <Label htmlFor="include-closed" className="text-sm font-normal cursor-pointer">
                Show closed &amp; cancelled tickets
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isLoading ? "Loading…" : `${filtered.length} tickets`}</CardTitle>
            <CardDescription>Click a ticket to triage and convert.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-16" />}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No tickets match these filters.</p>
            )}
            {filtered.map((t) => (
              <Link
                key={t.id}
                to={`/tickets/${t.id}`}
                className="flex justify-between gap-3 border rounded-md p-3 hover:border-primary"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {t.customerName ?? "Unknown caller"}
                    </span>
                    {t.queryType && (
                      <Badge variant="outline" className="text-[10px]">{t.queryType}</Badge>
                    )}
                    {t.priority && (
                      <Badge variant={PRIORITY_VARIANT[t.priority] ?? "outline"} className="text-[10px]">
                        {t.priority}
                      </Badge>
                    )}
                    <Badge variant={STATUS_VARIANT[t.status] ?? "outline"} className="text-[10px]">
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.customerEmail ?? "—"} · {t.customerPhone ?? "—"} · {t.sourceChannel ?? "—"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketsTriage;
