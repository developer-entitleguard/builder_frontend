import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useGetBuilderVendorsQuery } from "@/lib/api/services/builderVendor";
import {
  useGetJobsForQueryQuery,
  useCreateJobFromQueryMutation,
  useUpdateJobStatusMutation,
  useAssignJobVendorMutation,
  useDeleteJobMutation,
  type BuilderJob,
  type JobStatus,
} from "@/lib/api/services/jobs";
import JobAssignVendorDialog from "@/components/queries/JobAssignVendorDialog";
import VendorLinkModal from "@/components/VendorLinkModal";

const STATUSES: JobStatus[] = [
  "DRAFT",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function statusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800";
    case "ASSIGNED":
      return "bg-blue-100 text-blue-800";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function assigneeLabel(job: BuilderJob) {
  if (job.assigneeName || job.assigneeEmail) {
    return job.assigneeName
      ? `${job.assigneeName}${job.assigneeEmail ? ` (${job.assigneeEmail})` : ""}`
      : job.assigneeEmail;
  }
  if (job.assigneeOrgType && job.assigneeOrgId) {
    return `${job.assigneeOrgType} org`;
  }
  if (job.assigneeUserId) {
    return "Internal vendor";
  }
  return "Unassigned";
}

interface JobsPanelProps {
  queryId: string;
  builderId: string | null;
  canManage: boolean;
}

/**
 * Ticket/Query/Job refactor (Builder context). Lists the jobs spawned from this
 * converted ticket query and lets the builder add jobs, assign each to a vendor
 * (internal EG-portal user or external/off-platform contact), and move it
 * through its status lifecycle. No customer-facing surface changes.
 */
const JobsPanel = ({ queryId, builderId, canManage }: JobsPanelProps) => {
  const { toast } = useToast();
  const { data: jobs = [], isLoading } = useGetJobsForQueryQuery(
    { queryId, builderId: builderId ?? undefined },
    { skip: !queryId },
  );
  const { data: vendorResp } = useGetBuilderVendorsQuery(
    { builderId: builderId ?? "" },
    { skip: !builderId },
  );
  const vendors = vendorResp?.data ?? [];

  const [createJob, { isLoading: creating }] = useCreateJobFromQueryMutation();
  const [updateStatus] = useUpdateJobStatusMutation();
  const [assignJobVendor, { isLoading: assigning }] = useAssignJobVendorMutation();
  const [deleteJob] = useDeleteJobMutation();

  const [showAdd, setShowAdd] = useState(false);
  const [scope, setScope] = useState("");
  const [assignVendorByJob, setAssignVendorByJob] = useState<Record<string, string>>({});
  // Schedule dialog target for an internal vendor assignment.
  const [scheduleFor, setScheduleFor] = useState<
    { jobId: string; vendorId: string; vendorName: string } | null
  >(null);
  // After an external vendor is assigned, surface the shareable query link.
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const canAct = canManage && !!builderId;

  const vendorById = useMemo(() => {
    const m = new Map<string, (typeof vendors)[number]>();
    vendors.forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  const handleAdd = async () => {
    try {
      // Title is omitted — the backend defaults it to the source query's title.
      await createJob({
        queryId,
        builderId: builderId ?? "",
        scope: scope.trim() || undefined,
      }).unwrap();
      toast({ title: "Job created" });
      setScope("");
      setShowAdd(false);
    } catch (e) {
      toast({ title: "Could not create job", variant: "destructive" });
    }
  };

  const handleStatus = async (job: BuilderJob, status: JobStatus) => {
    try {
      await updateStatus({ id: job.id, builderId: builderId ?? "", status, queryId }).unwrap();
      toast({ title: "Status updated" });
    } catch (e) {
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  const handleAssign = async (job: BuilderJob) => {
    const vendorId = assignVendorByJob[job.id];
    const vendor = vendorId ? vendorById.get(vendorId) : undefined;
    if (!vendor) {
      toast({ title: "Pick a vendor", variant: "destructive" });
      return;
    }
    // Internal vendors (linked to an EG-portal user) need a scheduled time
    // booked against their availability — open the schedule dialog.
    if (vendor.userInfo?.id) {
      setScheduleFor({ jobId: job.id, vendorId: vendor.id, vendorName: vendor.name });
      return;
    }
    // External vendors: assign immediately, then surface the shareable link
    // the builder hands over manually.
    try {
      const res = await assignJobVendor({
        id: job.id,
        builderId: builderId ?? "",
        queryId,
        vendorId: vendor.id,
      }).unwrap();
      if (!res.success) {
        toast({ title: "Could not assign vendor", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Vendor assigned", description: "Share the vendor link below." });
      setLinkModalOpen(true);
    } catch (e) {
      toast({ title: "Could not assign vendor", variant: "destructive" });
    }
  };

  const handleDelete = async (job: BuilderJob) => {
    try {
      await deleteJob({ id: job.id, builderId: builderId ?? "", queryId }).unwrap();
      toast({ title: "Job removed" });
    } catch (e) {
      toast({ title: "Could not remove job", variant: "destructive" });
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5" />
          Jobs
          {jobs.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {jobs.length}
            </Badge>
          )}
        </CardTitle>
        {canAct && !showAdd && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Job
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && canAct && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              The job inherits this query's title. Add an optional scope to
              describe what this particular job covers.
            </p>
            <div className="space-y-1">
              <Label htmlFor="job-scope">Scope (optional)</Label>
              <Textarea
                id="job-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="What needs to be done"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={creating}>
                {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAdd(false);
                  setScope("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading jobs…
          </div>
        ) : jobs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No jobs yet for this query.
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{job.title}</p>
                    {job.scope && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {job.scope}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vendor: {assigneeLabel(job)}
                      {job.scheduledStart && (
                        <>
                          {" · "}
                          {format(new Date(job.scheduledStart), "dd MMM yyyy")}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge className={statusColor(job.status)}>{job.status}</Badge>
                </div>

                {canAct && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select
                      value={job.status}
                      onValueChange={(v) => handleStatus(job, v as JobStatus)}
                    >
                      <SelectTrigger className="h-8 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={assignVendorByJob[job.id] ?? ""}
                      onValueChange={(v) =>
                        setAssignVendorByJob((prev) => ({ ...prev, [job.id]: v }))
                      }
                    >
                      <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                            {v.userInfo?.id ? " (internal)" : " (external)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAssign(job)}
                      disabled={assigning || !assignVendorByJob[job.id]}
                    >
                      Assign
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive"
                      onClick={() => handleDelete(job)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

      {scheduleFor && builderId && (
        <JobAssignVendorDialog
          open={!!scheduleFor}
          onOpenChange={(o) => !o && setScheduleFor(null)}
          builderId={builderId}
          jobId={scheduleFor.jobId}
          queryId={queryId}
          vendorId={scheduleFor.vendorId}
          vendorName={scheduleFor.vendorName}
          onAssigned={() => setScheduleFor(null)}
        />
      )}

      <VendorLinkModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        queryId={queryId}
      />
    </>
  );
};

export default JobsPanel;
