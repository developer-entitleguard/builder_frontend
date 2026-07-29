import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Briefcase, Clock, Loader2, Plus, User, Hammer } from "lucide-react";
import Header from "@/components/Header";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGetBuilderQueriesQuery, useUpdateQueryMutation, useGetStatusesByModuleQuery } from "@/store/api";
import {
  useListTicketsQuery,
  useConvertTicketToQueryMutation,
  type Ticket,
} from "@/store/api/tickets";
import { useGetJobsForQueryQuery, type BuilderJob } from "@/lib/api/services/jobs";
import type { BuilderQuery } from "@/store/api/query";
import { canAssignVendors, readBuilderRoleFromStorage } from "@/lib/roles";

// ── Columns ──
// A single support board where a ticket naturally becomes a query, left→right:
//   Open (tickets) → Ready (open queries) → In Progress → Done → Closed/Cancelled (tickets)
// The three query columns are the old 3-lane board (Open renamed "Ready"); the two
// ticket columns are new. Only query columns accept status-change drags; a ticket
// dragged Open→Ready is "Mark as ready" (convert to query).
type ColumnKey = "open" | "ready" | "in_progress" | "done" | "closed";
type QueryLaneKey = "ready" | "in_progress" | "done";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  kind: "ticket" | "query";
  /** For query columns: the normalized backend status a card gets when dropped here. */
  statusName?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "open", label: "Open", kind: "ticket" },
  { key: "ready", label: "Ready", kind: "query", statusName: "CREATED" },
  { key: "in_progress", label: "In Progress", kind: "query", statusName: "INPROGRESS" },
  { key: "done", label: "Done", kind: "query", statusName: "DONE" },
  { key: "closed", label: "Closed / Cancelled", kind: "ticket" },
];

// Done cards drop off the board once they've been completed for this long.
const DONE_VISIBLE_DAYS = 10;

function normalizeStatus(name?: string | null): string {
  return (name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

// Which query column a query belongs in (legacy statuses fold into the nearest).
function laneForStatus(statusName?: string | null): QueryLaneKey {
  switch (normalizeStatus(statusName)) {
    case "DONE":
    case "COMPLETED":
      return "done";
    case "INPROGRESS":
    case "ASSIGNED":
    case "ASSINGED":
    case "ASSIGNEDTOVENDOR":
    case "AWAITINGVENDORACTION":
      return "in_progress";
    case "CREATED":
    case "REVIEW":
    default:
      return "ready";
  }
}

// Backend LocalDateTime has no zone and the server is UTC — tag bare timestamps
// so they're parsed as UTC rather than the viewer's local zone.
function parseTs(iso?: string | null): number {
  if (!iso) return NaN;
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(!hasTz && iso.includes("T") ? `${iso}Z` : iso).getTime();
}

function formatAge(iso?: string | null): string {
  const then = parseTs(iso);
  if (Number.isNaN(then)) return "—";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function completedWithinWindow(iso?: string | null): boolean {
  const then = parseTs(iso);
  if (Number.isNaN(then)) return true; // no timestamp → keep visible
  return Date.now() - then <= DONE_VISIBLE_DAYS * 86400000;
}

function ageInDays(iso?: string | null): number {
  const then = parseTs(iso);
  if (Number.isNaN(then)) return 0;
  return (Date.now() - then) / 86400000;
}

// Age-based severity: the older a query sits, the more it needs attention.
//   < 5 days → green · 5–10 days → amber · > 10 days → red
function severityStyles(iso?: string | null): { border: string; text: string } {
  const days = ageInDays(iso);
  if (days > 10) return { border: "border-l-red-500", text: "text-red-600" };
  if (days >= 5) return { border: "border-l-amber-500", text: "text-amber-600" };
  return { border: "border-l-emerald-500", text: "text-emerald-600" };
}

// Oldest first (smallest timestamp on top); undated cards sink to the bottom.
function byOldestFirst(a: BuilderQuery, b: BuilderQuery): number {
  const ta = parseTs(a.createdAt);
  const tb = parseTs(b.createdAt);
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return ta - tb;
}

interface JobSummary {
  done: number;
  total: number;
  loaded: boolean;
}

interface Person {
  key: string;
  initials: string;
  name: string;
}

function initialsFromName(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Distinct people assigned across a query's jobs, in job order.
function assigneesFromJobs(jobs: BuilderJob[]): Person[] {
  const map = new Map<string, Person>();
  for (const j of jobs) {
    const key = j.assigneeUserId || j.assigneeEmail || j.assigneeName || j.assigneeOrgId;
    if (!key) continue;
    const name = j.assigneeDisplayName || j.assigneeName || "Assignee";
    const initials = j.assigneeInitials || initialsFromName(name);
    if (!initials) continue;
    if (!map.has(key)) map.set(key, { key, initials, name });
  }
  return Array.from(map.values());
}

// Small circular initials badge. Owners are tinted to stand apart from assignees.
const InitialsAvatar = ({
  initials,
  title,
  variant = "assignee",
}: {
  initials: string;
  title: string;
  variant?: "owner" | "assignee" | "more";
}) => (
  <span
    title={title}
    className={cn(
      "inline-flex h-6 w-6 items-center justify-center rounded-full border border-background text-[10px] font-semibold",
      variant === "owner" && "bg-primary text-primary-foreground",
      variant === "assignee" && "bg-secondary text-secondary-foreground",
      variant === "more" && "bg-muted text-muted-foreground",
    )}
  >
    {initials}
  </span>
);

// Up to two assignee avatars, then a "+N" overflow; hover lists everyone.
const AssigneeStack = ({ people }: { people: Person[] }) => {
  if (people.length === 0) return null;
  const shown = people.slice(0, 2);
  const extra = people.length - shown.length;
  const all = people.map((p) => p.name).join(", ");
  return (
    <div className="flex items-center -space-x-1.5" title={`Assigned: ${all}`}>
      {shown.map((p) => (
        <InitialsAvatar key={p.key} initials={p.initials} title={p.name} />
      ))}
      {extra > 0 && <InitialsAvatar initials={`+${extra}`} title={all} variant="more" />}
    </div>
  );
};

// ── Card ──

const KanbanCard = ({
  query,
  builderId,
  onJobSummary,
}: {
  query: BuilderQuery;
  builderId: string | null;
  onJobSummary: (queryId: string, summary: JobSummary) => void;
}) => {
  const navigate = useNavigate();
  const { data: jobs, isSuccess } = useGetJobsForQueryQuery(
    { queryId: query.id, builderId: builderId ?? undefined },
    { skip: !query.id },
  );

  const summary = useMemo<JobSummary>(() => {
    // Cancelled jobs neither count toward the total nor block completion.
    const active = (jobs ?? []).filter((j) => j.status !== "CANCELLED");
    return {
      done: active.filter((j) => j.status === "COMPLETED").length,
      total: active.length,
      loaded: isSuccess,
    };
  }, [jobs, isSuccess]);

  useEffect(() => {
    if (isSuccess) onJobSummary(query.id, summary);
  }, [isSuccess, summary, query.id, onJobSummary]);

  const assignees = useMemo(() => assigneesFromJobs(jobs ?? []), [jobs]);
  const severity = severityStyles(query.createdAt);
  const showPeople = !!query.ownerInitials || assignees.length > 0;

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `query:${query.id}`);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => navigate(`/queries/${query.id}`)}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-l-4",
        severity.border,
      )}
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm leading-snug line-clamp-2">
          {query.title || "Untitled query"}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1" title="Postcode">
            <MapPin className="h-3 w-3 shrink-0" />
            {query.customerZip || "—"}
          </span>
          <span className="inline-flex items-center gap-1" title="Jobs completed">
            <Briefcase className="h-3 w-3 shrink-0" />
            {isSuccess ? `${summary.done}/${summary.total}` : "…"}
          </span>
          <span className={cn("inline-flex items-center gap-1 font-medium", severity.text)} title="Age">
            <Clock className="h-3 w-3 shrink-0" />
            {formatAge(query.createdAt)}
          </span>
          {query.responsibleBuilderName && (
            <span className="inline-flex items-center gap-1" title="Builder">
              <Hammer className="h-3 w-3 shrink-0" />
              {query.responsibleBuilderName}
            </span>
          )}
        </div>
        {showPeople && (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {query.ownerInitials ? (
              <InitialsAvatar
                initials={query.ownerInitials}
                title={`Owner: ${query.ownerName ?? "Unknown"}`}
                variant="owner"
              />
            ) : (
              <span />
            )}
            <AssigneeStack people={assignees} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Ticket card ──

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  URGENT: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

const TicketKanbanCard = ({ ticket, draggable }: { ticket: Ticket; draggable: boolean }) => {
  const navigate = useNavigate();
  const severity = severityStyles(ticket.createdAt);
  const priority = (ticket.priority || "").toUpperCase();
  const verdict = (ticket.coverageVerdict || "").toUpperCase();
  const terminal = ticket.status === "CLOSED" || ticket.status === "CANCELLED";
  return (
    <Card
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.setData("text/plain", `ticket:${ticket.id}`);
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className={cn(
        "hover:shadow-md transition-shadow border-l-4",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        severity.border,
      )}
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm leading-snug line-clamp-2">
          {ticket.title || ticket.queryType || "Support request"}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1" title="Caller">
            <User className="h-3 w-3 shrink-0" />
            {ticket.customerName || "Unknown caller"}
          </span>
          <span className={cn("inline-flex items-center gap-1 font-medium", severity.text)} title="Age">
            <Clock className="h-3 w-3 shrink-0" />
            {formatAge(ticket.createdAt)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {priority && (
            <Badge variant={PRIORITY_VARIANT[priority] ?? "outline"} className="text-[10px] px-1.5">
              {priority}
            </Badge>
          )}
          {terminal && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {ticket.status}
            </Badge>
          )}
          {(verdict === "LIKELY_NOT_COVERED" || verdict === "UNCERTAIN") && (
            <Badge
              variant={verdict === "LIKELY_NOT_COVERED" ? "destructive" : "secondary"}
              className="text-[10px] px-1.5"
            >
              {verdict === "LIKELY_NOT_COVERED" ? "May not be covered" : "Coverage unclear"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ── Board ──

const QueriesManagement = () => {
  const { organization, builderRole } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Tickets are visible to the same roles as the old Tickets page (Admin / CS).
  const effectiveBuilderRole = builderRole ?? readBuilderRoleFromStorage();
  const canSeeTickets = canAssignVendors(effectiveBuilderRole);

  const [dragOverLane, setDragOverLane] = useState<ColumnKey | null>(null);
  // When a query is moved to In Progress with no jobs, prompt to add some.
  const [jobPromptQueryId, setJobPromptQueryId] = useState<string | null>(null);
  // Ticket pending "Mark as ready" (convert to query) confirmation.
  const [pendingConvertTicketId, setPendingConvertTicketId] = useState<string | null>(null);
  // Job completion per query, kept in a ref so card updates don't re-render the
  // board; the drop handler reads the latest values to gate the Done lane.
  const jobSummaries = useRef<Record<string, JobSummary>>({});

  const builderId = useMemo(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.userInfo?.builderOrganization?.id) return parsed.userInfo.builderOrganization.id;
        if (parsed.builderOrganization?.id) return parsed.builderOrganization.id;
      } catch {
        // ignore
      }
    }
    return organization?.id ?? null;
  }, [organization?.id]);

  const userId = useMemo(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.userInfo?.id ?? parsed.id ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const { data: queriesData, isLoading, isFetching } = useGetBuilderQueriesQuery(
    { builderId: builderId ?? "", statusId: "-1" },
    { skip: !builderId, refetchOnMountOrArgChange: true },
  );

  const { data: statusesData } = useGetStatusesByModuleQuery({ module: "QUERY" });
  const [updateQuery] = useUpdateQueryMutation();
  const [convertTicket] = useConvertTicketToQueryMutation();

  // Tickets — only fetched for roles that may see them (Open + Closed columns).
  const { data: ticketsData } = useListTicketsQuery(
    { builderId: builderId ?? "", includeClosed: true },
    { skip: !builderId || !canSeeTickets },
  );

  const statusIdByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of statusesData?.data ?? []) {
      map[normalizeStatus(s.name)] = s.id;
    }
    return map;
  }, [statusesData]);

  const allQueries: BuilderQuery[] = useMemo(
    () => queriesData?.data ?? [],
    [queriesData],
  );

  // Query columns (ready / in_progress / done).
  const queryLanes = useMemo(() => {
    const groups: Record<QueryLaneKey, BuilderQuery[]> = { ready: [], in_progress: [], done: [] };
    for (const q of allQueries) {
      groups[laneForStatus(q.status?.name)].push(q);
    }
    // Hide queries that have been Done for more than the visible window.
    groups.done = groups.done.filter((q) => completedWithinWindow(q.updatedAt ?? q.createdAt));
    // Oldest on top in every lane so the most aged (severe) cards surface first.
    (Object.keys(groups) as QueryLaneKey[]).forEach((key) => groups[key].sort(byOldestFirst));
    return groups;
  }, [allQueries]);

  // Ticket columns (open / closed). CONVERTED tickets live on as their query.
  const ticketColumns = useMemo(() => {
    const groups: { open: Ticket[]; closed: Ticket[] } = { open: [], closed: [] };
    for (const t of ticketsData?.data ?? []) {
      if (t.status === "NEW" || t.status === "TRIAGED") groups.open.push(t);
      else if (t.status === "CLOSED" || t.status === "CANCELLED") groups.closed.push(t);
    }
    return groups;
  }, [ticketsData]);

  // Count per column for the header badges.
  const columnCount = (key: ColumnKey): number => {
    if (key === "open") return ticketColumns.open.length;
    if (key === "closed") return ticketColumns.closed.length;
    return queryLanes[key as QueryLaneKey].length;
  };

  const handleJobSummary = useCallback((queryId: string, summary: JobSummary) => {
    jobSummaries.current[queryId] = summary;
  }, []);

  const handleDrop = useCallback(
    async (columnKey: ColumnKey, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverLane(null);
      const payload = e.dataTransfer.getData("text/plain");
      if (!payload) return;
      const [kind, id] = payload.split(/:(.+)/);
      if (!id) return;

      // Ticket dragged into Ready = "Mark as ready" (convert). Only that move is allowed.
      if (kind === "ticket") {
        if (columnKey === "ready") {
          setPendingConvertTicketId(id);
        }
        return;
      }
      if (kind !== "query") return;

      // A query can only move between the three query columns.
      if (columnKey === "open" || columnKey === "closed") {
        toast({
          title: "Can't move there",
          description: "Queries move between Ready, In Progress and Done.",
          variant: "destructive",
        });
        return;
      }
      const laneKey = columnKey as QueryLaneKey;
      const query = allQueries.find((q) => q.id === id);
      if (!query) return;
      if (laneForStatus(query.status?.name) === laneKey) return;

      // Gate: a query can only be marked Done when every job on it is completed.
      if (laneKey === "done") {
        const s = jobSummaries.current[id];
        if (s && s.total > 0 && s.done < s.total) {
          toast({
            title: "Can't move to Done",
            description: `Complete all jobs first — ${s.done}/${s.total} done.`,
            variant: "destructive",
          });
          return;
        }
      }

      const statusId = statusIdByName[COLUMNS.find((c) => c.key === laneKey)!.statusName!];
      if (!statusId) {
        toast({
          title: "Can't move query",
          description: "That status isn't configured for this organization.",
          variant: "destructive",
        });
        return;
      }

      try {
        const res = await updateQuery({ id, statusId, userId: userId ?? undefined }).unwrap();
        if (!res.success) {
          toast({
            title: "Error",
            description: res.message || "Failed to move query.",
            variant: "destructive",
          });
          return;
        }
        // Moved to In Progress with no jobs yet — nudge the user to add some.
        if (laneKey === "in_progress") {
          const s = jobSummaries.current[id];
          if (!s || s.total === 0) {
            setJobPromptQueryId(id);
          }
        }
      } catch {
        toast({ title: "Error", description: "Failed to move query.", variant: "destructive" });
      }
    },
    [allQueries, statusIdByName, updateQuery, userId, toast],
  );

  const handleConfirmConvert = useCallback(async () => {
    const id = pendingConvertTicketId;
    setPendingConvertTicketId(null);
    if (!id) return;
    try {
      const res = await convertTicket({ id }).unwrap();
      if (!res.success) {
        toast({ title: "Couldn't mark as ready", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Marked as ready", description: "The ticket is now a query in Ready." });
    } catch {
      toast({ title: "Couldn't mark as ready", description: "Please try again.", variant: "destructive" });
    }
  }, [pendingConvertTicketId, convertTicket, toast]);

  const loading = isLoading || isFetching;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Support</h1>
            <p className="text-muted-foreground mt-1">
              Tickets come in on the left and progress into queries. Drag a card to move it along.
            </p>
          </div>
          <Button onClick={() => navigate("/queries/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Query
          </Button>
        </div>

        {loading && allQueries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading support board...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            {COLUMNS.filter((c) => canSeeTickets || c.kind === "query").map((col) => (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverLane(col.key);
                }}
                onDragLeave={() =>
                  setDragOverLane((prev) => (prev === col.key ? null : prev))
                }
                onDrop={(e) => handleDrop(col.key, e)}
                className={cn(
                  "md:flex-1 md:min-w-0 rounded-lg border bg-muted/30 p-3 min-h-[240px] transition-colors",
                  dragOverLane === col.key && "ring-2 ring-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="font-semibold text-sm">{col.label}</h2>
                  <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1.5">
                    {columnCount(col.key)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {col.kind === "ticket" ? (
                    (col.key === "open" ? ticketColumns.open : ticketColumns.closed).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        {col.key === "open" ? "No open tickets." : "Nothing closed or cancelled."}
                      </p>
                    ) : (
                      (col.key === "open" ? ticketColumns.open : ticketColumns.closed).map((t) => (
                        <TicketKanbanCard key={t.id} ticket={t} draggable={col.key === "open"} />
                      ))
                    )
                  ) : queryLanes[col.key as QueryLaneKey].length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {col.key === "done" ? "Nothing completed recently." : "No queries."}
                    </p>
                  ) : (
                    queryLanes[col.key as QueryLaneKey].map((q) => (
                      <KanbanCard
                        key={q.id}
                        query={q}
                        builderId={builderId}
                        onJobSummary={handleJobSummary}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog
        open={!!pendingConvertTicketId}
        onOpenChange={(open) => !open && setPendingConvertTicketId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as ready?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a query from the ticket and (for a homeowner-added property)
              verifies it. The ticket then shows as converted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConvert}>Mark as ready</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!jobPromptQueryId}
        onOpenChange={(open) => !open && setJobPromptQueryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add jobs to this query?</AlertDialogTitle>
            <AlertDialogDescription>
              This query is now In Progress but has no jobs yet. Jobs are how the work
              gets assigned and tracked. Would you like to add jobs now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = jobPromptQueryId;
                setJobPromptQueryId(null);
                if (id) navigate(`/queries/${id}#jobs`);
              }}
            >
              Add jobs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QueriesManagement;
