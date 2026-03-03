import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useApprovals, ApprovalRequest, ApprovalStatus, ApprovalType } from "@/hooks/useApprovals";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useGetProjectApprovalsQuery, useUpdateApprovalMutation, type BuilderApprovalApi } from "@/store/api/approvals";
import { useGetActivityByIdQuery } from "@/store/api/activities";
import { useGetStatusesByModuleQuery } from "@/store/api/status";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban,
  Calendar,
  User,
  Mail,
  FileText,
  Activity
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<ApprovalStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  approved: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Rejected" },
  cancelled: { icon: Ban, color: "bg-gray-100 text-gray-700", label: "Cancelled" }
};

function hasBuilderAuth(): boolean {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData) as { jwt?: string } | null;
    return !!parsed?.jwt;
  } catch {
    return false;
  }
}

function mapApiApprovalToRequest(item: BuilderApprovalApi, projectId: string): ApprovalRequest {
  const statusValue = (item as BuilderApprovalApi & { statusValue?: string }).statusValue;
  const statusRaw = statusValue ?? item.statusName ?? item.status ?? "PENDING";
  const statusName = String(statusRaw).toLowerCase();
  const status: ApprovalStatus = ["pending", "approved", "rejected", "cancelled"].includes(statusName)
    ? (statusName as ApprovalStatus)
    : "pending";
  const approvalTypeRaw = item.approvalType ?? item.approval_type ?? "Other";
  const approvalType = (typeof approvalTypeRaw === "string" ? approvalTypeRaw : "Other") as ApprovalType;
  const decisionComment = item.decisionComment ?? item.decision_comment;
  return {
    id: typeof item.id === "string" ? item.id : "",
    activity_id: typeof (item.activityId ?? item.activity_id) === "string" ? (item.activityId ?? item.activity_id) : "",
    project_id: projectId,
    registration_id: null,
    builder_id: "",
    approval_type: approvalType,
    title: typeof item.title === "string" ? item.title : "",
    description: typeof item.description === "string" ? item.description : null,
    approver_name: typeof (item.approverName ?? item.approver_name) === "string" ? (item.approverName ?? item.approver_name) as string : null,
    approver_email: typeof (item.approverEmail ?? item.approver_email) === "string" ? (item.approverEmail ?? item.approver_email) as string : null,
    status,
    requested_at: typeof (item.requestedAt ?? item.requested_at) === "string" ? (item.requestedAt ?? item.requested_at) as string : new Date().toISOString(),
    due_by: typeof (item.dueBy ?? item.due_by) === "string" ? (item.dueBy ?? item.due_by) : null,
    decided_at: typeof (item.decidedAt ?? item.decided_at) === "string" ? (item.decidedAt ?? item.decided_at) : null,
    decided_by: null,
    decision_comment: typeof decisionComment === "string" ? decisionComment : null,
    approval_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const ApprovalDetail = () => {
  const { projectId, approvalId } = useParams<{ projectId: string; approvalId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { fetchApproval, respondToApproval } = useApprovals(projectId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isBuilder = hasBuilderAuth();

  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [approvalFromApi, setApprovalFromApi] = useState(false);
  const [apiTriedAndNotFound, setApiTriedAndNotFound] = useState(false);
  const [activityName, setActivityName] = useState<string>("");
  const [registrationName, setRegistrationName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [decisionComment, setDecisionComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'approved' | 'rejected' | 'cancelled' | null }>({
    open: false,
    action: null
  });

  const { data: approvalsResponse, isLoading: approvalsLoading, refetch: refetchApprovals } = useGetProjectApprovalsQuery(
    { projectId: projectId ?? "" },
    { skip: !projectId || !approvalId }
  );

  const { data: activityResponse } = useGetActivityByIdQuery(
    { projectId: projectId ?? "", id: approval?.activity_id ?? "" },
    { skip: !projectId || !approval?.activity_id || !approvalFromApi }
  );

  const { data: statusResponse } = useGetStatusesByModuleQuery(
    { module: "APPROVAL_REQUEST" },
    { skip: !approvalFromApi || !confirmDialog.action }
  );

  const [updateApproval] = useUpdateApprovalMutation();

  useEffect(() => {
    if (!authLoading && !user && !isBuilder) {
      navigate('/auth');
    }
  }, [user, authLoading, isBuilder, navigate]);

  // Load approval from builder API first (so detail shows when coming from ApprovalsList)
  useEffect(() => {
    if (!approvalId || !projectId) return;

    if (approvalsLoading) {
      setLoading(true);
      return;
    }

    const list = approvalsResponse?.success && Array.isArray(approvalsResponse.data) ? approvalsResponse.data : [];
    const found = list.find(
      (a) =>
        String(a.id) === approvalId ||
        String((a as Record<string, unknown>)?.approvalId) === approvalId
    );
    if (found) {
      setApproval(mapApiApprovalToRequest(found, projectId));
      setRegistrationName(typeof (found.approverName ?? found.approver_name) === "string" ? (found.approverName ?? found.approver_name) : "");
      setApprovalFromApi(true);
      setApiTriedAndNotFound(false);
      setLoading(false);
    } else if (!approvalsLoading) {
      setLoading(false);
      if (isBuilder) {
        navigate(`/projects/${projectId}`);
      } else {
        setApiTriedAndNotFound(true);
      }
    }
  }, [approvalId, projectId, isBuilder, approvalsResponse, approvalsLoading, navigate]);

  // Reset API-not-found when params change
  useEffect(() => {
    setApiTriedAndNotFound(false);
  }, [approvalId, projectId]);

  // Load approval from Supabase only after API was tried and didn't find (non-builder)
  useEffect(() => {
    if (!approvalId || !user || isBuilder || !apiTriedAndNotFound) return;

    const loadApproval = async () => {
      setLoading(true);
      const data = await fetchApproval(approvalId);
      if (data) {
        setApproval(data);
        setApprovalFromApi(false);
        const { data: activity } = (await supabase
            .from('project_activities')
            .select('name')
            .eq('id', data.activity_id)
            .single()) as { data: { name?: string } | null };
        if (activity?.name) setActivityName(activity.name);
        if (data.registration_id) {
          const { data: registration } = await supabase
            .from('homeowner_registrations')
            .select('customer_name')
            .eq('id', data.registration_id)
            .single();
          if (registration) setRegistrationName(registration.customer_name);
        }
      } else {
        navigate(`/projects/${projectId}`);
      }
      setLoading(false);
    };
    loadApproval();
  }, [approvalId, user, isBuilder, apiTriedAndNotFound, projectId, fetchApproval, navigate]);

  // Set activity name when loaded from API
  useEffect(() => {
    if (approvalFromApi && activityResponse?.success && activityResponse?.data?.name) {
      setActivityName(activityResponse.data.name);
    }
  }, [approvalFromApi, activityResponse]);

  const handleRespond = async (status: 'approved' | 'rejected' | 'cancelled') => {
    setConfirmDialog({ open: true, action: status });
  };

  const confirmResponse = async () => {
    if (!confirmDialog.action || !approvalId || !approval) return;

    setIsSubmitting(true);
    let success = false;

    // Builder path: PUT /api/builder/projects/{projectId}/activities/{activityId}/approvals/{id}
    if (isBuilder && projectId && approval.activity_id) {
      const statuses = statusResponse?.success && Array.isArray(statusResponse.data) ? statusResponse.data : [];
      const actionToName: Record<string, string> = { approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };
      const name = actionToName[confirmDialog.action];
      const statusId = statuses.find((s) => s.name.toLowerCase() === confirmDialog.action)?.id
        ?? statuses.find((s) => s.name === name)?.id;
      if (!statusId) {
        toast({ title: "Error", description: "Could not resolve status.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      try {
        const apiResult = await updateApproval({
          projectId,
          activityId: approval.activity_id,
          id: approvalId,
          body: { decisionComment: decisionComment.trim(), statusId },
        }).unwrap();
        success = true;
        const result = await refetchApprovals();
        const list = result.data?.success && Array.isArray(result.data.data) ? result.data.data : [];
        const updated = list.find((a) => String(a.id) === approvalId);
        if (updated) setApproval(mapApiApprovalToRequest(updated, projectId));
        toast({
          title:
            confirmDialog.action === "approved"
              ? "Approved"
              : confirmDialog.action === "rejected"
              ? "Rejected"
              : "Cancelled",
          description: apiResult?.message ?? "Approval decision recorded successfully.",
        });
      } catch {
        toast({ title: "Error responding to approval", variant: "destructive" });
      }
    } else {
      success = await respondToApproval(approvalId, confirmDialog.action, decisionComment);
      if (success) {
        const data = await fetchApproval(approvalId);
        if (data) setApproval(data);
      }
    }

    setIsSubmitting(false);
    if (success) setConfirmDialog({ open: false, action: null });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!approval) {
    return null;
  }

  const config = statusConfig[approval.status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>

        <div className="grid gap-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={config.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Badge variant="outline">{approval.approval_type}</Badge>
                  </div>
                  <CardTitle className="text-2xl">{approval.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {approval.description && (
                <p className="text-muted-foreground mb-4">{approval.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Activity:</span>
                  <span>{activityName}</span>
                </div>
                
                {registrationName && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Registration:</span>
                    <span>{registrationName}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Requested:</span>
                  <span>{format(new Date(approval.requested_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                
                {approval.due_by && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due by:</span>
                    <span>{format(new Date(approval.due_by), 'MMM d, yyyy')}</span>
                  </div>
                )}
                
                {approval.approver_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Approver:</span>
                    <span>{approval.approver_name}</span>
                  </div>
                )}
                
                {approval.approver_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span>{approval.approver_email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Decision Card - Show if already decided */}
          {approval.status !== 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {approval.decided_at && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Decided on:</span>{' '}
                      {format(new Date(approval.decided_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                  {approval.decision_comment && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Comment:</p>
                      <p className="bg-muted p-3 rounded-md">{approval.decision_comment}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Card - Show only if pending */}
          {approval.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Take Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="decision-comment">Decision Comment (optional)</Label>
                  <Textarea
                    id="decision-comment"
                    value={decisionComment}
                    onChange={e => setDecisionComment(e.target.value)}
                    placeholder="Add any notes about your decision..."
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleRespond('approved')} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleRespond('rejected')}
                    disabled={isSubmitting}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleRespond('cancelled')}
                    disabled={isSubmitting}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'approved' && 'Approve this request?'}
              {confirmDialog.action === 'rejected' && 'Reject this request?'}
              {confirmDialog.action === 'cancelled' && 'Cancel this request?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will be recorded in the activity timeline for audit purposes.
              {decisionComment && (
                <span className="block mt-2">
                  Your comment: "{decisionComment}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmResponse}
              disabled={isSubmitting}
              className={
                confirmDialog.action === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                confirmDialog.action === 'rejected' ? 'bg-destructive hover:bg-destructive/90' :
                ''
              }
            >
              {isSubmitting ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApprovalDetail;
