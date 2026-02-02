import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
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
import { Activity, ActivityStatus, ActivityUpdate, CreateActivityData } from "@/hooks/useActivities";
import { CreateApprovalData } from "@/hooks/useApprovals";
import { RequestApprovalDialog } from "./RequestApprovalDialog";
import { 
  ArrowLeft, 
  Trash2, 
  Send, 
  Clock, 
  CheckCircle2, 
  ListTodo, 
  AlertTriangle,
  ShieldCheck,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface ActivityDetailProps {
  activity: Activity;
  projectId: string;
  onBack: () => void;
  onUpdateActivity: (id: string, data: Partial<CreateActivityData & { status: ActivityStatus }>) => Promise<boolean>;
  onDeleteActivity: (id: string) => Promise<boolean>;
  onFetchUpdates: (activityId: string) => Promise<ActivityUpdate[]>;
  onPostUpdate: (activityId: string, content: string) => Promise<boolean>;
  onRequestApproval: (activityId: string, data: CreateApprovalData) => Promise<any>;
  activityApprovals: import("@/hooks/useApprovals").ApprovalRequest[];
}

const statusOptions: { value: ActivityStatus; label: string; icon: React.ElementType }[] = [
  { value: 'pending', label: 'Pending', icon: ListTodo },
  { value: 'in_progress', label: 'In Progress', icon: Clock },
  { value: 'done', label: 'Done', icon: CheckCircle2 }
];

export const ActivityDetail = ({
  activity,
  projectId,
  onBack,
  onUpdateActivity,
  onDeleteActivity,
  onFetchUpdates,
  onPostUpdate,
  onRequestApproval,
  activityApprovals
}: ActivityDetailProps) => {
  const [updates, setUpdates] = useState<ActivityUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [updateContent, setUpdateContent] = useState("");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ActivityStatus>(activity.status);
  const [percentageComplete, setPercentageComplete] = useState(activity.percentage_complete || 0);

  // Sync local state when activity prop changes (after parent refetch)
  useEffect(() => {
    setCurrentStatus(activity.status);
    setPercentageComplete(activity.percentage_complete || 0);
  }, [activity.status, activity.percentage_complete]);

  useEffect(() => {
    loadUpdates();
  }, [activity.id]);

  const loadUpdates = async () => {
    setLoadingUpdates(true);
    const data = await onFetchUpdates(activity.id);
    setUpdates(data);
    setLoadingUpdates(false);
  };

  const handleStatusChange = async (newStatus: ActivityStatus) => {
    setCurrentStatus(newStatus);
    const newPercentage = newStatus === 'done' ? 100 : percentageComplete;
    if (newStatus === 'done') setPercentageComplete(100);
    await onUpdateActivity(activity.id, { status: newStatus, percentage_complete: newPercentage });
  };

  // Debounced save for percentage
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedSave = useCallback((newPercentage: number, newStatus: ActivityStatus) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      await onUpdateActivity(activity.id, { percentage_complete: newPercentage, status: newStatus });
    }, 300);
  }, [activity.id, onUpdateActivity]);

  const handlePercentageChange = (value: number[]) => {
    const newPercentage = value[0];
    setPercentageComplete(newPercentage);
    
    // Auto-update status based on percentage
    let newStatus = currentStatus;
    if (newPercentage === 100 && currentStatus !== 'done') {
      newStatus = 'done';
      setCurrentStatus('done');
    } else if (newPercentage > 0 && newPercentage < 100 && currentStatus === 'pending') {
      newStatus = 'in_progress';
      setCurrentStatus('in_progress');
    } else if (newPercentage === 0 && currentStatus !== 'pending') {
      newStatus = 'pending';
      setCurrentStatus('pending');
    }
    
    debouncedSave(newPercentage, newStatus);
  };

  const handlePostUpdate = async () => {
    if (!updateContent.trim()) return;
    
    setIsPostingUpdate(true);
    const success = await onPostUpdate(activity.id, updateContent.trim());
    setIsPostingUpdate(false);
    
    if (success) {
      setUpdateContent("");
      await loadUpdates();
    }
  };

  const handleDelete = async () => {
    await onDeleteActivity(activity.id);
    onBack();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Activities
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setApprovalDialogOpen(true)}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Request Approval
          </Button>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{activity.name}</CardTitle>
                <Select value={currentStatus} onValueChange={v => handleStatusChange(v as ActivityStatus)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.description ? (
                <p className="text-muted-foreground">{activity.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
              
              {/* Percentage Complete */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">{percentageComplete}%</span>
                </div>
                <Slider
                  value={[percentageComplete]}
                  onValueChange={handlePercentageChange}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <Progress value={percentageComplete} className="h-2" />
              </div>
              
              {activity.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Due: {format(new Date(activity.due_date), 'MMMM d, yyyy')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post an Update</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={updateContent}
                onChange={e => setUpdateContent(e.target.value)}
                placeholder="Share progress, notes, or any updates..."
                rows={3}
              />
              <div className="flex justify-end mt-3">
                <Button onClick={handlePostUpdate} disabled={!updateContent.trim() || isPostingUpdate}>
                  <Send className="h-4 w-4 mr-2" />
                  {isPostingUpdate ? "Posting..." : "Post Update"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Updates Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUpdates ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              ) : updates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No updates yet.</p>
              ) : (
                <div className="space-y-4">
                  {updates.map(update => (
                    <div key={update.id} className="border-l-2 border-muted pl-4 pb-4">
                      <p className="text-sm text-muted-foreground mb-1">
                        {format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      <p className="text-foreground">{update.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge variant="outline" className="mt-1 capitalize">{activity.priority}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(activity.created_at), 'MMM d, yyyy')}</p>
              </div>
              {activity.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-sm">{format(new Date(activity.completed_at), 'MMM d, yyyy')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this activity and all its updates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RequestApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        activityId={activity.id}
        activityName={activity.name}
        projectId={projectId}
        onSubmit={onRequestApproval}
      />
    </div>
  );
};
