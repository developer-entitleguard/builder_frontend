import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Activity, ActivityStatus, ActivityUpdate, CreateActivityData } from "@/hooks/useActivities";
import { ActivityCategory, CreateCategoryData } from "@/hooks/useActivityCategories";
import { CreateApprovalData } from "@/hooks/useApprovals";
import { useDeleteActivitiesMutation } from "@/store/api/activities";
import { useOrgVendors } from "@/hooks/useOrgVendors";
import { AddActivityDialog } from "./AddActivityDialog";
import { ActivityDetail } from "./ActivityDetail";
import { ActivityRow } from "./ActivityRow";
import { ActivityTypeDialog } from "./ActivityTypeDialog";
import { GenerateActivitiesDialog } from "./GenerateActivitiesDialog";
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
import {
  Plus,
  ListTodo,
  ChevronRight,
  ChevronDown,
  Eye,
  FolderPlus,
  Trash2,
  Pencil,
  FileSpreadsheet,
  Sparkles
} from "lucide-react";

interface ActivityListProps {
  activities: Activity[];
  categories: ActivityCategory[];
  loading: boolean;
  projectId: string;
  approvals: import("@/hooks/useApprovals").ApprovalRequest[];
  activitiesVisibleToHomeowner: boolean;
  onCreateActivity: (data: CreateActivityData) => Promise<Activity | null>;
  onUpdateActivity: (id: string, data: Partial<CreateActivityData & { status: ActivityStatus; completed?: boolean }>) => Promise<boolean>;
  onDeleteActivity: (id: string) => Promise<boolean>;
  onFetchUpdates: (activityId: string) => Promise<ActivityUpdate[]>;
  onPostUpdate: (activityId: string, content: string) => Promise<boolean>;
  onRequestApproval: (
    activityId: string,
    data: CreateApprovalData
  ) => Promise<import("@/hooks/useApprovals").ApprovalRequest | null>;
  onToggleHomeownerVisibility: (visible: boolean) => Promise<void>;
  onCreateCategory: (data: CreateCategoryData) => Promise<ActivityCategory | null>;
  onUpdateCategory: (id: string, data: Partial<CreateCategoryData>) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onRefresh?: () => void;
  onRefreshCategories?: () => void;
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

export const ActivityList = ({
  activities,
  categories,
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
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRefresh,
  onRefreshCategories
}: ActivityListProps) => {
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [singleDialogOpen, setSingleDialogOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [addActivityCategoryId, setAddActivityCategoryId] = useState<string | null>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(
    () => new Set()
  );
  const [editMode, setEditMode] = useState(false);

  const isBuilder = hasBuilderAuth();
  const { vendors } = useOrgVendors();

  const [deleteActivitiesMutation, { isLoading: isBulkDeleting }] =
    useDeleteActivitiesMutation();

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

  const toggleCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await onCreateCategory({ name: newCategoryName.trim() });
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleSaveEditCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    await onUpdateCategory(id, { name: editingCategoryName.trim() });
    setEditingCategoryId(null);
  };

  const toggleSelected = (activityId: string) => {
    setSelectedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  };

  const handleMarkCompleteToggle = async (
    activity: Activity,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const isCompleted = activity.completed ?? activity.status === "done";
    await onUpdateActivity(activity.id, { completed: !isCompleted });
    onRefresh?.();
  };

  const bulkDelete = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await deleteActivitiesMutation({ projectId, ids }).unwrap();
    } catch {
      for (const id of ids) {
        await onDeleteActivity(id);
      }
    } finally {
      setSelectedActivityIds(new Set());
      onRefresh?.();
    }
  };

  const getCategoryProgress = (categoryId: string) => {
    const catActivities = activities.filter(a => a.category_id === categoryId);
    if (catActivities.length === 0) return 0;
    const completed = catActivities.filter(a => a.completed ?? a.status === "done").length;
    return Math.round((completed / catActivities.length) * 100);
  };

  const getCategoryStats = (categoryId: string) => {
    const catActivities = activities.filter(a => a.category_id === categoryId);
    const completed = catActivities.filter(a => a.completed ?? a.status === "done").length;
    return { completed, total: catActivities.length };
  };

  const uncategorizedActivities = activities.filter(a => !a.category_id);
  const hasNoData = categories.length === 0 && activities.length === 0;

  if (hasNoData) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <ListTodo className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Generate a list from a short description, add a category and activities manually, or import from a CSV file.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Activities
          </Button>
          <Button variant="outline" onClick={() => setIsAddingCategory(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button variant="outline" onClick={() => setTypeDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import from CSV
          </Button>
        </div>

        {isAddingCategory && (
          <div className="flex items-center gap-2 mt-4 max-w-sm mx-auto">
            <Input
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              autoFocus
            />
            <Button size="sm" onClick={handleAddCategory}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
          </div>
        )}

        <GenerateActivitiesDialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            onRefresh?.();
            onRefreshCategories?.();
          }}
        />
        <ActivityTypeDialog
          open={typeDialogOpen}
          onOpenChange={setTypeDialogOpen}
          projectId={projectId}
          currentMaxOrder={currentMaxOrder}
          categories={categories}
          onSuccess={() => {
            onRefresh?.();
            onRefreshCategories?.();
          }}
          onSingleAdd={() => setSingleDialogOpen(true)}
          onCreateCategory={onCreateCategory}
        />
        <AddActivityDialog
          open={singleDialogOpen}
          onOpenChange={(open) => { setSingleDialogOpen(open); if (!open) setAddActivityCategoryId(null); }}
          onSubmit={async (data) => {
            return onCreateActivity({ ...data, category_id: addActivityCategoryId ?? undefined });
          }}
          categories={categories}
          defaultCategoryId={addActivityCategoryId}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="edit-activities" className="text-sm font-medium cursor-pointer">
              Edit activities inline
            </Label>
            <Switch
              id="edit-activities"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTypeDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteAllOpen(true)}
            disabled={selectedActivityIds.size === 0 || isBulkDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          <Button variant="outline" onClick={() => setIsAddingCategory(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {isAddingCategory && (
        <div className="flex items-center gap-2 mb-4">
          <Input
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Category name..."
            onKeyDown={e => e.key === "Enter" && handleAddCategory()}
            autoFocus
          />
          <Button size="sm" onClick={handleAddCategory}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }}>Cancel</Button>
        </div>
      )}

      <div className="space-y-4">
        {categories.map(category => {
          const isCollapsed = collapsedCategories.has(category.id);
          const apiProgress =
            typeof category.percentage_complete === "number"
              ? category.percentage_complete
              : undefined;
          const progressRaw = apiProgress ?? getCategoryProgress(category.id);
          const progress = Math.max(0, Math.min(100, Math.round(progressRaw)));

          const apiCompleted =
            typeof category.completed_activities === "number"
              ? category.completed_activities
              : undefined;
          const apiTotal =
            typeof category.total_activities === "number"
              ? category.total_activities
              : undefined;
          const stats =
            apiCompleted != null && apiTotal != null
              ? { completed: apiCompleted, total: apiTotal }
              : getCategoryStats(category.id);
          const catActivities = activities.filter(a => a.category_id === category.id);

          return (
            <Card key={category.id}>
              <CardContent className="p-0">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleCollapse(category.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    {editingCategoryId === category.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Input
                          value={editingCategoryName}
                          onChange={e => setEditingCategoryName(e.target.value)}
                          className="h-8 w-48"
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSaveEditCategory(category.id);
                            if (e.key === "Escape") setEditingCategoryId(null);
                          }}
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleSaveEditCategory(category.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {stats.completed}/{stats.total}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 w-32">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteCategoryId(category.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setAddActivityCategoryId(category.id); setSingleDialogOpen(true); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Activity
                    </Button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="border-t">
                    {catActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No activities in this category yet.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {catActivities.map(activity => (
                          <ActivityRow
                            key={activity.id}
                            activity={activity}
                            projectId={projectId}
                            editMode={editMode}
                            isBuilder={isBuilder}
                            isSelected={selectedActivityIds.has(activity.id)}
                            vendors={vendors}
                            onToggleSelect={toggleSelected}
                            onOpen={setSelectedActivityId}
                            onUpdateActivity={onUpdateActivity}
                            onMarkCompleteToggle={handleMarkCompleteToggle}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {uncategorizedActivities.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="p-4">
                <h3 className="font-semibold text-muted-foreground">Uncategorized</h3>
              </div>
              <div className="border-t divide-y">
                {uncategorizedActivities.map(activity => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    projectId={projectId}
                    editMode={editMode}
                    isBuilder={isBuilder}
                    isSelected={selectedActivityIds.has(activity.id)}
                    vendors={vendors}
                    onToggleSelect={toggleSelected}
                    onOpen={setSelectedActivityId}
                    onUpdateActivity={onUpdateActivity}
                    onMarkCompleteToggle={handleMarkCompleteToggle}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all activities within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteCategoryId) {
                  // Delete all activities in this category via the activities DELETE API
                  const catActivities = activities.filter(
                    (a) => a.category_id === deleteCategoryId
                  );
                  await bulkDelete(catActivities.map((a) => a.id));

                  // Then delete the category itself (no-op for builder until wired)
                  await onDeleteCategory(deleteCategoryId);
                  onRefresh?.();
                }
                setDeleteCategoryId(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected activities?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected activities in this project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await bulkDelete(Array.from(selectedActivityIds));
                setDeleteAllOpen(false);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ActivityTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        projectId={projectId}
        currentMaxOrder={currentMaxOrder}
        categories={categories}
        onSuccess={() => {
          onRefresh?.();
          onRefreshCategories?.();
        }}
        onSingleAdd={() => setSingleDialogOpen(true)}
        onCreateCategory={onCreateCategory}
      />
      <AddActivityDialog
        open={singleDialogOpen}
        onOpenChange={(open) => { setSingleDialogOpen(open); if (!open) setAddActivityCategoryId(null); }}
        onSubmit={async (data) => {
          return onCreateActivity({ ...data, category_id: addActivityCategoryId ?? undefined });
        }}
        categories={categories}
        defaultCategoryId={addActivityCategoryId}
      />
    </div>
  );
};
