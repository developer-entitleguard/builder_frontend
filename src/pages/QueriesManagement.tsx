import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Clock, Loader2, Plus } from "lucide-react";
import Header from "@/components/Header";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGetBuilderQueriesQuery, useUpdateQueryMutation, useGetStatusesByModuleQuery } from "@/store/api";
import { useGetJobsForQueryQuery } from "@/lib/api/services/jobs";
import type { BuilderQuery } from "@/store/api/query";

// ── Lanes ──
// The query lifecycle is intentionally reduced to three lanes. Legacy statuses
// (REVIEW, ASSIGNED, ASSIGNED TO VENDOR, AWAITING VENDOR, COMPLETED) are folded
// into the nearest lane so no card is dropped, but dragging only ever sets one
// of the three canonical statuses below.
type LaneKey = "open" | "in_progress" | "done";

interface LaneDef {
  key: LaneKey;
  label: string;
  /** Normalized backend status name a card gets when dropped into this lane. */
  statusName: string;
}

const LANES: LaneDef[] = [
  { key: "open", label: "Open", statusName: "CREATED" },
  { key: "in_progress", label: "In Progress", statusName: "INPROGRESS" },
  { key: "done", label: "Done", statusName: "DONE" },
];

// Done cards drop off the board once they've been completed for this long.
const DONE_VISIBLE_DAYS = 10;

function normalizeStatus(name?: string | null): string {
  return (name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

function laneForStatus(statusName?: string | null): LaneKey {
  switch (normalizeStatus(statusName)) {
    case "CREATED":
    case "REVIEW":
      return "open";
    case "DONE":
    case "COMPLETED":
      return "done";
    case "INPROGRESS":
    case "ASSIGNED":
    case "ASSINGED":
    case "ASSIGNEDTOVENDOR":
    case "AWAITINGVENDORACTION":
      return "in_progress";
    default:
      return "open";
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

interface JobSummary {
  done: number;
  total: number;
  loaded: boolean;
}

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

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", query.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => navigate(`/queries/${query.id}`)}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
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
          <span className="inline-flex items-center gap-1" title="Age">
            <Clock className="h-3 w-3 shrink-0" />
            {formatAge(query.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Board ──

const QueriesManagement = () => {
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dragOverLane, setDragOverLane] = useState<LaneKey | null>(null);
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

  const lanes = useMemo(() => {
    const groups: Record<LaneKey, BuilderQuery[]> = { open: [], in_progress: [], done: [] };
    for (const q of allQueries) {
      groups[laneForStatus(q.status?.name)].push(q);
    }
    // Hide queries that have been Done for more than the visible window.
    groups.done = groups.done.filter((q) => completedWithinWindow(q.updatedAt ?? q.createdAt));
    return groups;
  }, [allQueries]);

  const handleJobSummary = useCallback((queryId: string, summary: JobSummary) => {
    jobSummaries.current[queryId] = summary;
  }, []);

  const handleDrop = useCallback(
    async (laneKey: LaneKey, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverLane(null);
      const queryId = e.dataTransfer.getData("text/plain");
      if (!queryId) return;
      const query = allQueries.find((q) => q.id === queryId);
      if (!query) return;
      if (laneForStatus(query.status?.name) === laneKey) return;

      // Gate: a query can only be marked Done when every job on it is completed.
      if (laneKey === "done") {
        const s = jobSummaries.current[queryId];
        if (s && s.total > 0 && s.done < s.total) {
          toast({
            title: "Can't move to Done",
            description: `Complete all jobs first — ${s.done}/${s.total} done.`,
            variant: "destructive",
          });
          return;
        }
      }

      const statusId = statusIdByName[LANES.find((l) => l.key === laneKey)!.statusName];
      if (!statusId) {
        toast({
          title: "Can't move query",
          description: "That status isn't configured for this organization.",
          variant: "destructive",
        });
        return;
      }

      try {
        const res = await updateQuery({ id: queryId, statusId, userId: userId ?? undefined }).unwrap();
        if (!res.success) {
          toast({
            title: "Error",
            description: res.message || "Failed to move query.",
            variant: "destructive",
          });
        }
      } catch {
        toast({ title: "Error", description: "Failed to move query.", variant: "destructive" });
      }
    },
    [allQueries, statusIdByName, updateQuery, userId, toast],
  );

  const loading = isLoading || isFetching;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Queries</h1>
            <p className="text-muted-foreground mt-1">Drag a card between lanes to update its status.</p>
          </div>
          <Button onClick={() => navigate("/queries/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Query
          </Button>
        </div>

        {loading && allQueries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading queries...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {LANES.map((lane) => (
              <div
                key={lane.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverLane(lane.key);
                }}
                onDragLeave={() =>
                  setDragOverLane((prev) => (prev === lane.key ? null : prev))
                }
                onDrop={(e) => handleDrop(lane.key, e)}
                className={cn(
                  "rounded-lg border bg-muted/30 p-3 min-h-[240px] transition-colors",
                  dragOverLane === lane.key && "ring-2 ring-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="font-semibold text-sm">{lane.label}</h2>
                  <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1.5">
                    {lanes[lane.key].length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {lanes[lane.key].length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {lane.key === "done" ? "Nothing completed recently." : "No queries."}
                    </p>
                  ) : (
                    lanes[lane.key].map((q) => (
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
    </div>
  );
};

export default QueriesManagement;
