import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Activity, ActivityStatus, ActivityUpdate, CreateActivityData } from "@/hooks/useActivities";
import { useAssignActivityMutation, useDeleteActivitiesMutation, useGetActivityByIdQuery, useGetActivityUpdatesQuery, usePostActivityUpdateMutation, useUpdateActivityMutation } from "@/store/api/activities";
import { useDeleteActivityCategoryMutation } from "@/store/api/activityCategories";
import { useToast } from "@/hooks/use-toast";
import { CreateApprovalData } from "@/hooks/useApprovals";
import { RequestApprovalDialog } from "./RequestApprovalDialog";
import { ContactCombobox, ContactValue } from "./ContactCombobox";
import { useOrgVendors } from "@/hooks/useOrgVendors";
import {
  ArrowLeft,
  Trash2,
  Send,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  DollarSign,
  User
} from "lucide-react";
import { format } from "date-fns";

interface ActivityDetailProps {
  activity: Activity;
  projectId: string;
  onBack: () => void;
  onUpdateActivity: (
    id: string,
    data: Partial<CreateActivityData & { status: ActivityStatus; completed?: boolean }>
  ) => Promise<boolean>;
  onDeleteActivity: (id: string) => Promise<boolean>;
  onFetchUpdates: (activityId: string) => Promise<ActivityUpdate[]>;
  onPostUpdate: (activityId: string, content: string) => Promise<boolean>;
  onRequestApproval: (activityId: string, data: CreateApprovalData) => Promise<import("@/hooks/useApprovals").ApprovalRequest | null>;
  activityApprovals: import("@/hooks/useApprovals").ApprovalRequest[];
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

export const ActivityDetail = ({
  activity,
  projectId,
  onBack,
  onUpdateActivity,
  onDeleteActivity,
  onFetchUpdates,
  onPostUpdate,
  onRequestApproval,
  activityApprovals,
}: ActivityDetailProps) => {
  const { toast } = useToast();
  const isBuilder = hasBuilderAuth();

  const [updateActivityMutation] = useUpdateActivityMutation();
  const [postActivityUpdateMutation] = usePostActivityUpdateMutation();
  const [deleteActivityCategory] = useDeleteActivityCategoryMutation();
  const [deleteActivitiesMutation] = useDeleteActivitiesMutation();

  // Call builder GET /api/builder/projects/{projectId}/activities/{id} when in builder mode
  const { data: builderActivityResp } = useGetActivityByIdQuery(
    { projectId, id: activity.id },
    { skip: !isBuilder }
  );
  const builderActivity = builderActivityResp?.data;

  const [assignActivity, { isLoading: assigningActivity }] = useAssignActivityMutation();
  const { vendors } = useOrgVendors();

  // Fire the trade/auditor invite for the current contact. Returns false when
  // there's no email to invite (callers can ignore).
  const inviteContact = async (name: string, email: string): Promise<boolean> => {
    if (!isBuilder || !email.trim()) return false;
    try {
      await assignActivity({
        projectId,
        activityId: activity.id,
        body: {
          assigneeName: name.trim() || null,
          assigneeEmail: email.trim(),
        },
      }).unwrap();
      toast({
        title: "Activity assigned",
        description: "The trade/auditor was invited to this job.",
      });
      return true;
    } catch {
      toast({ title: "Couldn't assign activity", variant: "destructive" });
      return false;
    }
  };

  const handleAssignActivity = () => inviteContact(vendorName, vendorEmail);

  const [updates, setUpdates] = useState<ActivityUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [updateContent, setUpdateContent] = useState("");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [completed, setCompleted] = useState(activity.completed ?? false);
  const [quote, setQuote] = useState(activity.quote?.toString() ?? "");
  const [pricePaid, setPricePaid] = useState(activity.price_paid?.toString() ?? "");
  const [vendorName, setVendorName] = useState(activity.vendor_name ?? "");
  const [vendorEmail, setVendorEmail] = useState(activity.vendor_email ?? "");
  const [vendorPhone, setVendorPhone] = useState(activity.vendor_phone ?? "");

  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const {
    data: builderUpdatesResponse,
    isLoading: builderUpdatesLoading,
    refetch: refetchBuilderUpdates,
  } = useGetActivityUpdatesQuery(
    { activityId: activity.id },
    { skip: !isBuilder || !activity.id }
  );

  useEffect(() => {
    setCompleted(activity.completed ?? false);
    setQuote(activity.quote?.toString() ?? "");
    setPricePaid(activity.price_paid?.toString() ?? "");
    setVendorName(activity.vendor_name ?? "");
    setVendorEmail(activity.vendor_email ?? "");
    setVendorPhone(activity.vendor_phone ?? "");
  }, [
    activity.completed,
    activity.quote,
    activity.price_paid,
    activity.vendor_name,
    activity.vendor_email,
    activity.vendor_phone,
  ]);

  const loadUpdates = useCallback(async () => {
    if (isBuilder) {
      await refetchBuilderUpdates();
      return;
    }
    setLoadingUpdates(true);
    const data = await onFetchUpdates(activity.id);
    setUpdates(data);
    setLoadingUpdates(false);
  }, [activity.id, onFetchUpdates, isBuilder, refetchBuilderUpdates]);

  useEffect(() => {
    if (isBuilder) {
      setLoadingUpdates(builderUpdatesLoading);
      if (!builderUpdatesLoading && builderUpdatesResponse?.success && Array.isArray(builderUpdatesResponse.data)) {
        const list: ActivityUpdate[] = builderUpdatesResponse.data.map((u, i) => ({
          id: u.id ?? `update-${i}`,
          activity_id: activity.id,
          builder_id: "",
          content: u.content ?? "",
          attachments: [],
          created_at: u.createdAt ?? u.updatedAt ?? new Date().toISOString(),
        }));
        setUpdates(list);
      } else if (!builderUpdatesLoading) {
        setUpdates([]);
      }
    }
  }, [isBuilder, builderUpdatesLoading, builderUpdatesResponse, activity.id]);

  useEffect(() => {
    if (!isBuilder) {
      void loadUpdates();
    }
  }, [loadUpdates, isBuilder]);

  const handleToggleCompleted = async (checked: boolean) => {
    setCompleted(checked);
    await onUpdateActivity(activity.id, { completed: checked });
  };

  // Picking/adding a contact in the Assignment card: store it on the activity
  // and, when the email is new, fire the trade invite (per spec: invite on set).
  const handleSetContact = async (contact: ContactValue) => {
    const emailChanged =
      !!contact.email.trim() && contact.email.trim() !== (vendorEmail.trim() || "");
    setVendorName(contact.name);
    setVendorEmail(contact.email);
    setVendorPhone(contact.phone);
    await onUpdateActivity(activity.id, {
      vendor_name: contact.name || null,
      vendor_email: contact.email || null,
      vendor_phone: contact.phone || null,
    } as Partial<CreateActivityData>);
    if (emailChanged) {
      await inviteContact(contact.name, contact.email);
    }
  };

  const handleSaveDetails = async () => {
    setIsSavingDetails(true);

    // For builder mode, also PUT /api/builder/projects/{projectId}/activities/{id}
    if (isBuilder) {
      const isCompleted = completed;

      const body = {
        categoryId: activity.category_id ?? null,
        completed: isCompleted,
        completedAt: isCompleted
          ? activity.completed_at ?? new Date().toISOString()
          : null,
        description: activity.description ?? "",
        dueDate: activity.due_date ?? "",
        name: activity.name,
        orderIndex: activity.order_index,
        pricePaid: pricePaid ? parseFloat(pricePaid) : 0,
        quote: quote ? parseFloat(quote) : 0,
        vendorEmail: vendorEmail || "",
        vendorName: vendorName || "",
        vendorPhone: vendorPhone || "",
      };

      try {
        await updateActivityMutation({
          projectId,
          id: activity.id,
          body,
        }).unwrap();
      } catch {
        // Swallow error here; Supabase update below still runs to keep legacy data in sync
      }
    }

    await onUpdateActivity(activity.id, {
      quote: quote ? parseFloat(quote) : null,
      price_paid: pricePaid ? parseFloat(pricePaid) : null,
      vendor_name: vendorName || null,
      vendor_email: vendorEmail || null,
      vendor_phone: vendorPhone || null,
    } as Partial<CreateActivityData>);

    setIsSavingDetails(false);
  };

  const handlePostUpdate = async () => {
    if (!updateContent.trim()) return;

    setIsPostingUpdate(true);
    const content = updateContent.trim();

    if (isBuilder) {
      try {
        await postActivityUpdateMutation({
          activityId: activity.id,
          body: { content },
        }).unwrap();
        setUpdateContent("");
        await loadUpdates();
      } catch {
        // Error toast could be added here
      }
      setIsPostingUpdate(false);
      return;
    }

    const success = await onPostUpdate(activity.id, content);
    setIsPostingUpdate(false);

    if (success) {
      setUpdateContent("");
      await loadUpdates();
    }
  };

  const handleDelete = async () => {
    try {
      if (isBuilder) {
        await deleteActivitiesMutation({ projectId, ids: [activity.id] }).unwrap();
        setDeleteDialogOpen(false);
        onBack();
      } else {
        await onDeleteActivity(activity.id);
        setDeleteDialogOpen(false);
        onBack();
      }
    } catch (error: unknown) {
      const message = error && typeof error === "object" && "data" in error
        ? String((error as { data?: unknown }).data ?? "Failed to delete activity")
        : error instanceof Error ? error.message : "Failed to delete activity";
      toast({
        title: "Error deleting activity",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Activities
        </Button>

        <div className="flex items-center gap-2">
          <Button onClick={handleSaveDetails} disabled={isSavingDetails}>
            {isSavingDetails ? "Saving..." : "Save Details"}
          </Button>
          <Button variant="outline" onClick={() => setApprovalDialogOpen(true)}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Request Approval
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
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
                <CardTitle
                  className={completed ? "line-through text-muted-foreground" : ""}
                >
                  {activity.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="completed-toggle" className="text-sm">
                    Completed
                  </Label>
                  <Switch
                    id="completed-toggle"
                    checked={completed}
                    onCheckedChange={handleToggleCompleted}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.description ? (
                <p className="text-muted-foreground">{activity.description}</p>
              ) : (
                <p className="text-muted-foreground italic">
                  No description provided.
                </p>
              )}

              {completed && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                  {activity.completed_at && (
                    <span className="text-muted-foreground">
                      on{" "}
                      {format(
                        new Date(activity.completed_at),
                        "MMMM d, yyyy"
                      )}
                    </span>
                  )}
                </div>
              )}

              {activity.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Due:{" "}
                  {format(new Date(activity.due_date), "MMMM d, yyyy")}
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
                onChange={(e) => setUpdateContent(e.target.value)}
                placeholder="Share progress, notes, or any updates..."
                rows={3}
              />
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handlePostUpdate}
                  disabled={!updateContent.trim() || isPostingUpdate}
                >
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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : updates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No updates yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="border-l-2 border-muted pl-4 pb-4"
                    >
                      <p className="text-sm text-muted-foreground mb-1">
                        {format(
                          new Date(update.created_at),
                          "MMM d, yyyy h:mm a"
                        )}
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
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {completed ? "Completed" : "Pending"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {activity.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">
                  {format(new Date(activity.created_at), "MMM d, yyyy")}
                </p>
              </div>
              {activity.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-sm">
                    {format(new Date(activity.completed_at), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label
                  htmlFor="quote"
                  className="text-xs text-muted-foreground"
                >
                  Quote
                </Label>
                <Input
                  id="quote"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  className="mt-1 h-8"
                />
              </div>
              <div>
                <Label
                  htmlFor="price-paid"
                  className="text-xs text-muted-foreground"
                >
                  Price Paid
                </Label>
                <Input
                  id="price-paid"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  className="mt-1 h-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Assignment — pick or add the trade/auditor for this activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isBuilder && builderActivity?.jobId ? (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Assigned to: </span>
                    <span className="font-medium">
                      {builderActivity.assigneeDisplayName ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Job status: </span>
                    <span className="font-medium">{builderActivity.jobStatus ?? "—"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reassign by choosing a different contact below.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Assign this activity to a trade or auditor — this creates a job and invites
                  them. Their compliance certificate flows back to you automatically.
                </p>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Contact</Label>
                <ContactCombobox
                  className="mt-1 h-8"
                  value={{ name: vendorName, email: vendorEmail, phone: vendorPhone }}
                  vendors={vendors}
                  onChange={handleSetContact}
                />
              </div>
              {vendorPhone && (
                <p className="text-xs text-muted-foreground">Phone: {vendorPhone}</p>
              )}
              {isBuilder && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAssignActivity}
                  disabled={assigningActivity || !vendorEmail.trim()}
                >
                  {assigningActivity
                    ? "Assigning…"
                    : builderActivity?.jobId
                      ? "Reassign"
                      : "Assign to trade / auditor"}
                </Button>
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
              This will permanently delete this activity and all its updates.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
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
