import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApprovalRequest, ApprovalStatus, ApprovalType } from "@/hooks/useApprovals";
import { Activity } from "@/hooks/useActivities";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban,
  ChevronRight,
  Filter,
  Calendar,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";

interface ApprovalsListProps {
  approvals: ApprovalRequest[];
  activities: Activity[];
  loading: boolean;
  projectId: string;
}

const statusConfig: Record<ApprovalStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  approved: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Rejected" },
  cancelled: { icon: Ban, color: "bg-gray-100 text-gray-700", label: "Cancelled" }
};

const approvalTypes: ApprovalType[] = [
  'Scope Change',
  'Variation',
  'Material Change',
  'Schedule Change',
  'Payment Milestone',
  'Other'
];

export const ApprovalsList = ({
  approvals,
  activities,
  loading,
  projectId
}: ApprovalsListProps) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const getActivityName = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.name || 'Unknown Activity';
  };

  const filteredApprovals = approvals.filter(approval => {
    if (statusFilter !== "all" && approval.status !== statusFilter) return false;
    if (typeFilter !== "all" && approval.approval_type !== typeFilter) return false;
    return true;
  });

  const handleApprovalClick = (approvalId: string) => {
    navigate(`/projects/${projectId}/approvals/${approvalId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {approvalTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || typeFilter !== "all") && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredApprovals.length} of {approvals.length} approval requests
      </p>

      {filteredApprovals.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No approvals</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {approvals.length === 0 
              ? "Request approvals from activity details to track sign-offs."
              : "No approvals match the current filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map(approval => {
            const config = statusConfig[approval.status];
            const StatusIcon = config.icon;
            
            return (
              <Card 
                key={approval.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleApprovalClick(approval.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{approval.approval_type}</Badge>
                        </div>
                        
                        <h4 className="font-medium">{approval.title}</h4>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          Activity: {getActivityName(approval.activity_id)}
                        </p>
                        
                        {approval.approver_name && (
                          <p className="text-sm text-muted-foreground">
                            Approver: {approval.approver_name}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Requested: {format(new Date(approval.requested_at), 'MMM d, yyyy')}</span>
                          {approval.due_by && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {format(new Date(approval.due_by), 'MMM d, yyyy')}
                            </span>
                          )}
                          {approval.decided_at && (
                            <span>Decided: {format(new Date(approval.decided_at), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>{config.label}</Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
