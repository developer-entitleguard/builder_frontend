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
import {
  Loader2,
  Plus,
  Trash2,
  Briefcase,
  LinkIcon,
  MessageSquare,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useGetBuilderVendorsQuery } from "@/lib/api/services/builderVendor";
import {
  useGetJobsForQueryQuery,
  useCreateJobFromQueryMutation,
  useUpdateJobStatusMutation,
  useAssignJobVendorMutation,
  useSendJobSmsMutation,
  useDeleteJobMutation,
  type BuilderJob,
  type JobStatus,
} from "@/lib/api/services/jobs";
import JobAssignVendorDialog from "@/components/queries/JobAssignVendorDialog";
import VendorLinkModal from "@/components/VendorLinkModal";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

/** Off-platform vendor — reached via an emailed link (has a contact, no portal user). */
function isExternalAssigned(job: BuilderJob) {
  return !job.assigneeUserId && !!(job.assigneeName || job.assigneeEmail);
}

/** Any vendor assigned (internal or external) — both can be reached via the link/SMS. */
function hasAssignee(job: BuilderJob) {
  return !!(job.assigneeUserId || job.assigneeName || job.assigneeEmail);
}

/** Closed jobs can't be reassigned or rescheduled. */
function isTerminal(status: string) {
  return status === "COMPLETED" || status === "CANCELLED";
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
  const vendors = useMemo(() => vendorResp?.data ?? [], [vendorResp]);
  const [createJob, { isLoading: creating }] = useCreateJobFromQueryMutation();
  const [updateStatus] = useUpdateJobStatusMutation();
  const [assignJobVendor, { isLoading: assigning }] = useAssignJobVendorMutation();
  const [deleteJob] = useDeleteJobMutation();

  const [showAdd, setShowAdd] = useState(false);
  const [scope, setScope] = useState("");
  // Optional vendor chosen in the Add Job form — assigns in the same flow.
  const [newVendorId, setNewVendorId] = useState("");
  const [assignVendorByJob, setAssignVendorByJob] = useState<Record<string, string>>({});
  // Schedule dialog target for an internal vendor assignment.
  const [scheduleFor, setScheduleFor] = useState<
    { jobId: string; vendorId: string; vendorName: string } | null
  >(null);
  // After an external vendor is assigned, surface the shareable query link.
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  // Per-job "Send SMS" dialog: the job being texted + the typed-in number.
  const [smsForJob, setSmsForJob] = useState<string | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [sendJobSms, { isLoading: sendingSms }] = useSendJobSmsMutation();

  const handleSendSms = async () => {
    if (!smsForJob || !builderId || !smsPhone.trim()) return;
    try {
      const res = await sendJobSms({
        id: smsForJob,
        builderId,
        queryId,
        phone: smsPhone.trim(),
      }).unwrap();
      toast({
        title: res?.success ? "SMS sent" : "Couldn't send SMS",
        description: res?.message,
        variant: res?.success ? undefined : "destructive",
      });
      if (res?.success) {
        setSmsForJob(null);
        setSmsPhone("");
      }
    } catch {
      toast({ title: "Couldn't send SMS", variant: "destructive" });
    }
  };

  const canAct = canManage && !!builderId;

  const vendorById = useMemo(() => {
    const m = new Map<string, (typeof vendors)[number]>();
    vendors.forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  // Resolve the vendor a job is already assigned to back to a vendor.id, so the
  // "Select vendor" dropdown can show it instead of the placeholder. Assignment
  // persists assignee fields (not the vendor.id), so we reverse-map them:
  // internal vendors by their portal user id, off-platform vendors by email/name.
  const vendorIdForJob = useMemo(() => {
    const byUserId = new Map<string, string>();
    const byEmail = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const v of vendors) {
      if (v.userInfo?.id) byUserId.set(v.userInfo.id, v.id);
      if (v.email) byEmail.set(v.email.toLowerCase(), v.id);
      if (v.name) byName.set(v.name.toLowerCase(), v.id);
    }
    return (job: BuilderJob): string | undefined => {
      if (job.assigneeUserId) return byUserId.get(job.assigneeUserId);
      if (job.assigneeEmail) return byEmail.get(job.assigneeEmail.toLowerCase());
      if (job.assigneeName) return byName.get(job.assigneeName.toLowerCase());
      return undefined;
    };
  }, [vendors]);

  const handleAdd = async () => {
    try {
      // Title is omitted — the backend defaults it to the source query's title.
      const created = await createJob({
        queryId,
        builderId: builderId ?? "",
        scope: scope.trim() || undefined,
      }).unwrap();
      toast({ title: "Job created" });
      setScope("");
      setShowAdd(false);

      // If a vendor was picked in the same form, assign it now.
      const vendor = newVendorId ? vendorById.get(newVendorId) : undefined;
      setNewVendorId("");
      if (!vendor) return;

      // Internal vendors need a scheduled time booked against their
      // availability — open the schedule dialog targeting the new job.
      if (vendor.userInfo?.id) {
        setScheduleFor({ jobId: created.id, vendorId: vendor.id, vendorName: vendor.name });
        return;
      }
      // External vendors: assign immediately, then surface the shareable link.
      try {
        const res = await assignJobVendor({
          id: created.id,
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
            <div className="space-y-1">
              <Label>Assign vendor (optional)</Label>
              <Select
                value={newVendorId}
                onValueChange={(v) => setNewVendorId(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Leave blank to create a draft" />
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
              <p className="text-xs text-muted-foreground">
                Internal vendors prompt for a schedule; external vendors get a
                shareable link.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={creating || assigning}>
                {(creating || assigning) && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAdd(false);
                  setScope("");
                  setNewVendorId("");
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
                    {job.unitNumber && (
                      <p className="mt-0.5 text-xs font-medium text-foreground">
                        Unit: {job.unitNumber}
                      </p>
                    )}
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
                          {format(new Date(job.scheduledStart), "dd MMM yyyy, h:mm a")}
                          {job.scheduledEnd && (
                            <>{" – "}{format(new Date(job.scheduledEnd), "h:mm a")}</>
                          )}
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

                    {!isTerminal(job.status) && (() => {
                      const assignedVendorId = vendorIdForJob(job);
                      const selectedVendorId =
                        assignVendorByJob[job.id] ?? assignedVendorId ?? "";
                      // Only enable Assign when a vendor is chosen that differs
                      // from the one already on the job.
                      const canAssign =
                        !!selectedVendorId && selectedVendorId !== assignedVendorId;
                      return (
                        <>
                          <Select
                            value={selectedVendorId}
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
                            disabled={assigning || !canAssign}
                          >
                            Assign
                          </Button>
                        </>
                      );
                    })()}

                    {/* Reschedule an internal vendor already on the job — opens the
                        same calendar, where existing blocks can be moved/resized. */}
                    {job.assigneeUserId && !isTerminal(job.status) && (() => {
                      const vId = vendorIdForJob(job);
                      const v = vId ? vendorById.get(vId) : undefined;
                      if (!v) return null;
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setScheduleFor({
                              jobId: job.id,
                              vendorId: v.id,
                              vendorName: v.name,
                            })
                          }
                        >
                          <CalendarClock className="mr-1 h-4 w-4" />
                          Reschedule
                        </Button>
                      );
                    })()}

                    {hasAssignee(job) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLinkModalOpen(true)}
                      >
                        <LinkIcon className="mr-1 h-4 w-4" />
                        Get link
                      </Button>
                    )}

                    {hasAssignee(job) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSmsPhone("");
                          setSmsForJob(job.id);
                        }}
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Send SMS
                      </Button>
                    )}

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

      <Dialog open={!!smsForJob} onOpenChange={(o) => !o && setSmsForJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Text the job link to the vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="job-sms-phone">Mobile number</Label>
            <Input
              id="job-sms-phone"
              type="tel"
              inputMode="tel"
              placeholder="04XX XXX XXX"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll text "a job has been assigned" with the secure link. Australian numbers.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsForJob(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendSms} disabled={sendingSms || !smsPhone.trim()}>
              {sendingSms && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JobsPanel;
