import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganization";
import { useListTicketsQuery, type Ticket } from "@/store/api/tickets";
import { formatDateTime } from "@/lib/datetime";

type TabKey = "open" | "converted" | "closed";

// Converted / Closed tabs only surface the most recent few — older history is noise here.
const RECENT_LIMIT = 10;

function getTabForStatus(status: Ticket["status"]): TabKey {
  switch (status) {
    case "CONVERTED":
      return "converted";
    case "CLOSED":
    case "CANCELLED":
      return "closed";
    default:
      return "open";
  }
}

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

const TicketRow = ({ t }: { t: Ticket }) => (
  <Link
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
      {t.createdAt ? formatDateTime(t.createdAt) : ""}
    </div>
  </Link>
);

const TicketsTriage = () => {
  const { effectiveOrganization } = useOrganization();
  const builderId = effectiveOrganization?.id;

  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("open");

  // Fetch everything (including closed/cancelled) once and split into tabs client-side.
  // The backend already orders by createdAt DESC, so the recent slices are the head.
  const { data, isLoading } = useListTicketsQuery(
    {
      builderId: builderId ?? "",
      priority: priorityFilter || undefined,
      includeClosed: true,
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

  const grouped = useMemo(() => {
    const groups: Record<TabKey, Ticket[]> = { open: [], converted: [], closed: [] };
    for (const t of filtered) {
      groups[getTabForStatus(t.status)].push(t);
    }
    return groups;
  }, [filtered]);

  const openTickets = grouped.open;
  const convertedTickets = useMemo(() => grouped.converted.slice(0, RECENT_LIMIT), [grouped.converted]);
  const closedTickets = useMemo(() => grouped.closed.slice(0, RECENT_LIMIT), [grouped.closed]);

  const TicketList = ({ tickets, emptyHint }: { tickets: Ticket[]; emptyHint: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{isLoading ? "Loading…" : `${tickets.length} tickets`}</CardTitle>
        <CardDescription>Click a ticket to triage and convert.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Skeleton className="h-16" />}
        {!isLoading && tickets.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        )}
        {tickets.map((t) => (
          <TicketRow key={t.id} t={t} />
        ))}
      </CardContent>
    </Card>
  );

  const TabBadge = ({ count }: { count: number }) =>
    count > 0 ? (
      <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs px-1.5">
        {count}
      </Badge>
    ) : null;

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
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Search name, email, phone, description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="mb-4">
            <TabsTrigger value="open" className="gap-1.5">
              Open
              <TabBadge count={openTickets.length} />
            </TabsTrigger>
            <TabsTrigger value="converted" className="gap-1.5">
              Converted to Query
              <TabBadge count={convertedTickets.length} />
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-1.5">
              Closed / Cancelled
              <TabBadge count={closedTickets.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            <TicketList tickets={openTickets} emptyHint="No open tickets." />
          </TabsContent>
          <TabsContent value="converted">
            <p className="text-xs text-muted-foreground mb-2">Showing the most recent {RECENT_LIMIT}.</p>
            <TicketList tickets={convertedTickets} emptyHint="No tickets converted to a query yet." />
          </TabsContent>
          <TabsContent value="closed">
            <p className="text-xs text-muted-foreground mb-2">Showing the most recent {RECENT_LIMIT}.</p>
            <TicketList tickets={closedTickets} emptyHint="No closed or cancelled tickets." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TicketsTriage;
