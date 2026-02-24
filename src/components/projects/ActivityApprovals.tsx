import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalRequest, ApprovalStatus } from "@/hooks/useApprovals";
import { Clock, CheckCircle2, XCircle, Ban, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ActivityApprovalsProps {
  approvals: ApprovalRequest[];
  projectId: string;
}

const statusConfig: Record<ApprovalStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  approved: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Rejected" },
  cancelled: { icon: Ban, color: "bg-gray-100 text-gray-700", label: "Cancelled" }
};

export const ActivityApprovals = ({ approvals, projectId }: ActivityApprovalsProps) => {
  const navigate = useNavigate();

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No approval requests for this activity yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Approvals ({approvals.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvals.map(approval => {
          const config = statusConfig[approval.status];
          const StatusIcon = config.icon;
          
          return (
            <div
              key={approval.id}
              className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/projects/${projectId}/approvals/${approval.id}`)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${config.color} text-xs`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{approval.approval_type}</Badge>
                </div>
                <p className="font-medium text-sm">{approval.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{format(new Date(approval.requested_at), 'MMM d, yyyy')}</span>
                  {approval.due_by && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {format(new Date(approval.due_by), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
