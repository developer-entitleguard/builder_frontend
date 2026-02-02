import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Activity, ActivityStatus, ActivityPriority, ActivityUpdate, CreateActivityData } from "@/hooks/useActivities";
import { CreateApprovalData } from "@/hooks/useApprovals";
import { AddActivityDialog } from "./AddActivityDialog";
import { ActivityDetail } from "./ActivityDetail";
import { ActivityTypeDialog } from "./ActivityTypeDialog";
import { 
  Plus, 
  ListTodo, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface ActivityListProps {
  activities: Activity[];
  loading: boolean;
  projectId: string;
  approvals: import("@/hooks/useApprovals").ApprovalRequest[];
  activitiesVisibleToHomeowner: boolean;
  onCreateActivity: (data: CreateActivityData) => Promise<Activity | null>;
  onUpdateActivity: (id: string, data: Partial<CreateActivityData & { status: ActivityStatus }>) => Promise<boolean>;
  onDeleteActivity: (id: string) => Promise<boolean>;
  onFetchUpdates: (activityId: string) => Promise<ActivityUpdate[]>;
  onPostUpdate: (activityId: string, content: string) => Promise<boolean>;
  onRequestApproval: (activityId: string, data: CreateApprovalData) => Promise<any>;
  onToggleHomeownerVisibility: (visible: boolean) => Promise<void>;
}

const statusConfig: Record<ActivityStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: ListTodo, color: "bg-slate-100 text-slate-700", label: "Pending" },
  in_progress: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "In Progress" },
  done: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Done" }
};

const priorityConfig: Record<ActivityPriority, { color: string; label: string }> = {
  low: { color: "bg-gray-100 text-gray-600", label: "Low" },
  medium: { color: "bg-blue-100 text-blue-600", label: "Medium" },
  high: { color: "bg-orange-100 text-orange-600", label: "High" },
  urgent: { color: "bg-red-100 text-red-600", label: "Urgent" }
};

export const ActivityList = ({
  activities,
  loading,
  projectId,
  approvals,
  activitiesVisibleToHomeowner,
  onCreateActivity,
  onUpdateActivity,
  onDeleteActivity,
  onFetchUpdates,
  onPostUpdate,
  onRequestApproval,
  onToggleHomeownerVisibility,
  onRefresh
}: ActivityListProps & { onRefresh?: () => void }) => {
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [singleDialogOpen, setSingleDialogOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const currentMaxOrder = activities.length > 0 
    ? Math.max(...activities.map(a => a.order_index)) + 1 
    : 0;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedActivity = selectedActivityId
    ? activities.find(a => a.id === selectedActivityId) || null
    : null;

  if (selectedActivity) {
    const activityApprovals = approvals.filter(a => a.activity_id === selectedActivity.id);
    return (
      <ActivityDetail
        activity={selectedActivity}
        projectId={projectId}
        onBack={() => setSelectedActivityId(null)}
        onUpdateActivity={onUpdateActivity}
        onDeleteActivity={onDeleteActivity}
        onFetchUpdates={onFetchUpdates}
        onPostUpdate={onPostUpdate}
        onRequestApproval={onRequestApproval}
        activityApprovals={activityApprovals}
      />
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <ListTodo className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Add your first activity to start tracking progress on this project.
        </p>
        <Button onClick={() => setTypeDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Activity
        </Button>
        
        <ActivityTypeDialog
          open={typeDialogOpen}
          onOpenChange={setTypeDialogOpen}
          projectId={projectId}
          currentMaxOrder={currentMaxOrder}
          onSuccess={onRefresh}
          onSingleAdd={() => setSingleDialogOpen(true)}
        />
        <AddActivityDialog
          open={singleDialogOpen}
          onOpenChange={setSingleDialogOpen}
          onSubmit={onCreateActivity}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="homeowner-visibility" className="text-sm font-medium cursor-pointer">
            Homeowner can view progress
          </Label>
          <Switch
            id="homeowner-visibility"
            checked={activitiesVisibleToHomeowner}
            onCheckedChange={onToggleHomeownerVisibility}
          />
        </div>
        <Button onClick={() => setTypeDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>

      <div className="space-y-3">
        {activities.map(activity => {
          const status = statusConfig[activity.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          
          return (
            <Card
              key={activity.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedActivityId(activity.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${status.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{activity.name}</h4>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>
                      )}
                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={activity.percentage_complete || 0} className="h-1.5 flex-1 max-w-32" />
                        <span className="text-xs text-muted-foreground">{activity.percentage_complete || 0}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={status.color}>
                      {status.label}
                    </Badge>
                    {activity.due_date && (
                      <span className="text-sm text-muted-foreground">
                        Due: {format(new Date(activity.due_date), 'MMM d')}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ActivityTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        projectId={projectId}
        currentMaxOrder={currentMaxOrder}
        onSuccess={onRefresh}
        onSingleAdd={() => setSingleDialogOpen(true)}
      />
      <AddActivityDialog
        open={singleDialogOpen}
        onOpenChange={setSingleDialogOpen}
        onSubmit={onCreateActivity}
      />
    </div>
  );
};
