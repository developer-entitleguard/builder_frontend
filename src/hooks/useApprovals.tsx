import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useCreateApprovalMutation, useUpdateApprovalMutation } from "@/store/api/approvals";

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalType = 'Scope Change' | 'Variation' | 'Material Change' | 'Schedule Change' | 'Payment Milestone' | 'Other';

export interface ApprovalRequest {
  id: string;
  activity_id: string;
  project_id: string;
  registration_id: string | null;
  builder_id: string;
  approval_type: ApprovalType;
  title: string;
  description: string | null;
  approver_name: string | null;
  approver_email: string | null;
  status: ApprovalStatus;
  requested_at: string;
  due_by: string | null;
  decided_at: string | null;
  decided_by: string | null;
  decision_comment: string | null;
  approval_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApprovalData {
  approval_type: ApprovalType;
  title: string;
  description?: string | null;
  registration_id?: string | null;
  approver_name?: string | null;
  approver_email?: string | null;
  due_by?: string | null;
}

// Builder auth helper for JWT stored in localStorage.userData
const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData) as { jwt?: string } | null;
    return !!parsed?.jwt;
  } catch {
    return false;
  }
};

export const useApprovals = (projectId: string | undefined) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const isBuilder = hasBuilderAuth();
  const [createApprovalMutation] = useCreateApprovalMutation();
  const [updateApprovalMutation] = useUpdateApprovalMutation();

  const fetchApprovals = useCallback(async () => {
    if (!projectId || !user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setApprovals((data as ApprovalRequest[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching approvals",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, user, toast]);

  const fetchApproval = async (approvalId: string): Promise<ApprovalRequest | null> => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (error) throw error;
      return data as ApprovalRequest;
    } catch (error: any) {
      toast({
        title: "Error fetching approval",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const requestApproval = async (activityId: string, data: CreateApprovalData): Promise<ApprovalRequest | null> => {
    if (!user || !projectId) throw new Error('Not authenticated or no project');
    if (!organization) throw new Error('No organization found');
    
    try {
      // Generate approval token for email-based approval
      const approvalToken = crypto.randomUUID();
      
      const { data: result, error } = await supabase
        .from('approval_requests')
        .insert({
          ...data,
          activity_id: activityId,
          project_id: projectId,
          builder_id: user.id,
          organization_id: organization.id,
          approval_token: approvalToken
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create activity update for audit trail
      await supabase
        .from('activity_updates')
        .insert({
          activity_id: activityId,
          builder_id: user.id,
          organization_id: organization.id,
          content: `🔔 Approval requested: "${data.title}" (${data.approval_type})${data.approver_name ? ` - Awaiting ${data.approver_name}` : ''}`
        });
      
      // If approver email is provided, send email notification
      if (data.approver_email && data.registration_id) {
        try {
          await supabase.functions.invoke('approval-notification', {
            body: {
              action: 'request_approval',
              approval_id: result.id,
              approval_token: approvalToken
            }
          });
        } catch (emailError) {
          console.error('Error sending approval email:', emailError);
          // Don't fail the approval creation if email fails
        }
      }

      await fetchApprovals();
      toast({
        title: "Approval requested",
        description: "Approval request has been submitted."
      });
      return result as ApprovalRequest;
    } catch (error: any) {
      toast({
        title: "Error requesting approval",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const respondToApproval = async (
    id: string, 
    status: 'approved' | 'rejected' | 'cancelled', 
    decisionComment?: string
  ): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get the approval first to create audit trail
      const { data: approval } = await supabase
        .from('approval_requests')
        .select('activity_id, title, approval_type')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('approval_requests')
        .update({
          status,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
          decision_comment: decisionComment || null
        })
        .eq('id', id);

      if (error) throw error;

      // Also call builder approvals API when in builder mode
      if (isBuilder && projectId && approval?.activity_id) {
        try {
          const body = {
            decisionComment: decisionComment || "",
            statusId: status,
          };

          await updateApprovalMutation({
            projectId,
            activityId: approval.activity_id,
            id,
            body,
          }).unwrap();
        } catch {
          // Ignore builder API errors; Supabase remains source of truth for UI
        }
      }

      // Auto-create activity update for audit trail
      if (approval && organization) {
        const statusEmoji = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '🚫';
        await supabase
          .from('activity_updates')
          .insert({
            activity_id: approval.activity_id,
            builder_id: user.id,
            organization_id: organization.id,
            content: `${statusEmoji} Approval ${status}: "${approval.title}"${decisionComment ? ` - "${decisionComment}"` : ''}`
          });
      }
      
      await fetchApprovals();
      toast({
        title: status === 'approved' ? "Approved" : status === 'rejected' ? "Rejected" : "Cancelled",
        description: `Request has been ${status}.`
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error responding to approval",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const resolvedApprovals = approvals.filter(a => a.status !== 'pending');

  return {
    approvals,
    pendingApprovals,
    resolvedApprovals,
    loading,
    fetchApprovals,
    fetchApproval,
    requestApproval,
    respondToApproval
  };
};
