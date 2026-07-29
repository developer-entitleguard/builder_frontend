import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects, Project, PropertyType, ProjectStatus, CreateProjectData } from "@/hooks/useProjects";
import { useActivities } from "@/hooks/useActivities";
import { useActivityCategories } from "@/hooks/useActivityCategories";
import { useApprovals } from "@/hooks/useApprovals";
import { useAuth } from "@/hooks/useAuth";
import { BUILDER_ROLES, readBuilderRoleFromStorage } from "@/lib/roles";
import { useProjectByIdQuery, useDeleteProjectMutation, type BuilderProjectApi } from "@/store/api/projects";
import { useToast } from "@/hooks/use-toast";
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
import { useGetProjectApprovalsQuery } from "@/store/api/approvals";
import { useGetStatusesByModuleQuery } from "@/store/api/status";
import { ActivityList } from "@/components/projects/ActivityList";
import { ActivitySummary } from "@/components/projects/ActivitySummary";
import { ApprovalsList } from "@/components/projects/ApprovalsList";
import { ProjectRegistrations } from "@/components/projects/ProjectRegistrations";
import { ProjectPricing } from "@/components/projects/ProjectPricing";
import { ProjectComplianceSection } from "@/components/compliance/ProjectComplianceSection";
import { ProjectSharesCard } from "@/components/projects/ProjectSharesCard";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  ArrowLeft,
  Home,
  Building2,
  Building,
  LayoutGrid,
  Hammer,
  PlusCircle,
  Settings,
  MapPin,
  Edit,
  Share2,
  Trash2,
  DollarSign,
  FileBarChart,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const propertyTypeConfig: Record<PropertyType, { icon: React.ElementType; color: string; label: string }> = {
  house: { icon: Home, color: "bg-blue-100 text-blue-700", label: "House" },
  townhouse: { icon: Building2, color: "bg-green-100 text-green-700", label: "Townhouse" },
  apartment: { icon: Building, color: "bg-purple-100 text-purple-700", label: "Apartment" },
  duplex: { icon: LayoutGrid, color: "bg-orange-100 text-orange-700", label: "Duplex" },
  renovation: { icon: Hammer, color: "bg-yellow-100 text-yellow-700", label: "Renovation" },
  extension: { icon: PlusCircle, color: "bg-teal-100 text-teal-700", label: "Extension" },
  custom: { icon: Settings, color: "bg-gray-100 text-gray-700", label: "Custom" }
};

const statusConfig: Record<ProjectStatus, { color: string; label: string }> = {
  planning: { color: "bg-slate-100 text-slate-700", label: "Planning" },
  in_progress: { color: "bg-blue-100 text-blue-700", label: "In Progress" },
  on_hold: { color: "bg-yellow-100 text-yellow-700", label: "On Hold" },
  completed: { color: "bg-green-100 text-green-700", label: "Completed" },
  cancelled: { color: "bg-red-100 text-red-700", label: "Cancelled" }
};

// Consider user authenticated if Supabase session OR builder login (userData.jwt in localStorage)
const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!parsed?.jwt;
  } catch {
    return false;
  }
};

const mapPropertyTypeLocal = (value: string | null | undefined): PropertyType => {
  if (!value) return "custom";
  const key = value.toLowerCase();
  switch (key) {
    case "house":
      return "house";
    case "townhouse":
      return "townhouse";
    case "apartment":
      return "apartment";
    case "duplex":
      return "duplex";
    case "renovation":
      return "renovation";
    case "extension":
      return "extension";
    case "custom":
      return "custom";
    default:
      return "custom";
  }
};

const mapStatusLocal = (value: string | null | undefined): ProjectStatus => {
  if (!value) return "planning";
  const key = value.toLowerCase().replace(/\s+/g, "");
  switch (key) {
    case "planning":
      return "planning";
    case "inprogress":
    case "in_progress":
      return "in_progress";
    case "onhold":
    case "on_hold":
      return "on_hold";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "planning";
  }
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const isAdmin = readBuilderRoleFromStorage() === BUILDER_ROLES.ADMINISTRATOR;
  // Developer/Builder Decoupling PRD (Req 2): the "Builders" tab (delegate the
  // build to a separate builder org) is only meaningful for developer-capable orgs.
  const { hasCapability, hasModule } = useEntitlements();
  const canDevelop = hasCapability("DEVELOP");
  const { user, loading: authLoading } = useAuth();
  const { updateProject } = useProjects();
  const { activities, loading: activitiesLoading, fetchActivities, createActivity, updateActivity, deleteActivity, fetchUpdates, postUpdate } = useActivities(id);
  const { categories, createCategory, updateCategory, deleteCategory, refetch: refetchCategories } = useActivityCategories(id);
  const { approvals, loading: approvalsLoading, fetchApprovals, requestApproval, respondToApproval } = useApprovals(id);
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const isBuilder = hasBuilderAuth();

  const { data: approvalsApiResponse } = useGetProjectApprovalsQuery(
    { projectId: id ?? "" },
    { skip: !id || !isBuilder }
  );

  const approvalsCount =
    isBuilder && approvalsApiResponse?.success && Array.isArray(approvalsApiResponse.data)
      ? approvalsApiResponse.data.length
      : approvals.length;

  const {
    data: projectResponse,
    isLoading: projectLoading,
  } = useProjectByIdQuery({ id: id! });
  // Pricing is the builder's data — hidden from a developer-operator of a decoupled
  // project. Defaults to visible when the flag is absent (older responses).
  const pricingVisible = projectResponse?.data?.pricingVisible !== false;
  // Project tabs are individually entitled now that PROJECTS was split into
  // per-tab modules. hasModule fails open while entitlements load, so tabs never
  // flash-hide. Compliance reuses the existing COMPLIANCE_DOCS module.
  const showActivitiesTab = hasModule("ACTIVITIES");
  const showRegistrationsTab = hasModule("REGISTRATIONS");
  const showApprovalsTab = hasModule("APPROVALS");
  const showComplianceTab = hasModule("COMPLIANCE_DOCS");
  const showPricingTab = pricingVisible && hasModule("PRICING");
  const defaultProjectTab = showActivitiesTab
    ? "activities"
    : showRegistrationsTab
    ? "registrations"
    : showApprovalsTab
    ? "approvals"
    : showComplianceTab
    ? "compliance"
    : showPricingTab
    ? "pricing"
    : "activities";
  // Delete is an operator action and only while the project is still in flight
  // (not completed). The server additionally blocks it once any unit is handed over.
  const isOperatorRole = projectResponse?.data?.accessRole !== "SCOPED_BUILDER";
  // A developer-operator whose build is delegated to a builder sees a read-only
  // activities summary (progress only) — not the editable activities page.
  const activitiesSummaryOnly = isOperatorRole && projectResponse?.data?.delegatedToBuilder === true;
  const projectCompleted = (projectResponse?.data?.status ?? "").toLowerCase() === "completed";
  const canDelete = isOperatorRole && !projectCompleted;
  const { toast } = useToast();
  const [deleteProjectMutation, { isLoading: deletingProject }] = useDeleteProjectMutation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteProject = async () => {
    try {
      const res = await deleteProjectMutation(id!).unwrap();
      if (res.success) {
        toast({ title: res.message || "Project deleted" });
        navigate("/projects");
      } else {
        toast({ title: res.message || "Could not delete project", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Could not delete project",
        description: err?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const { data: statusResponse } = useGetStatusesByModuleQuery({ module: "PROJECT" });
  const projectStatuses = statusResponse?.data ?? [];

  useEffect(() => {
    if (!authLoading && !user && !hasBuilderAuth()) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id || projectLoading) return;
    // The query has resolved. If it came back without a project (server error or
    // not-found — the API returns HTTP 200 with success:false), stop loading so
    // the page shows an error instead of spinning forever.
    if (!projectResponse?.data) {
      setLoading(false);
      return;
    }
    const p = projectResponse.data as BuilderProjectApi;
    const mapped: Project = {
      id: p.id,
      builder_id: "",
      name: p.name,
      address: p.address,
      city: p.city,
      state: p.state,
      postcode: p.postcode,
      property_type: mapPropertyTypeLocal(p.propertyType),
      building_class: p.buildingClass ?? null,
      start_date: p.startDate,
      target_end_date: p.targetEndDate,
      actual_end_date: p.actualEndDate,
      status: mapStatusLocal(p.status),
      description: p.description,
      bal_rating: p.balRatingId ?? null,
      topography_type: p.topographyTypeId ?? null,
      activities_visible_to_homeowner: p.activitiesVisibleToHomeowner,
      created_at: p.createdAt,
      updated_at: p.createdAt,
      has_gas: p.hasGas ?? null,
      has_pool: p.hasPool ?? null,
      has_lift: p.hasLift ?? null,
      is_strata: p.isStrata ?? null,
      has_ducted_hvac: p.hasDuctedHvac ?? null,
    };
    setProject(mapped);
    fetchActivities();
    fetchApprovals();
    setLoading(false);
  }, [projectResponse, projectLoading, id, fetchActivities, fetchApprovals]);

  // Resolve the current project's statusId from the statuses API
  const resolveStatusId = (): string | null => {
    if (!project) return null;
    const normalizedStatus = (project.status ?? "").toLowerCase().replace(/[\s_]/g, "");
    if (!normalizedStatus) return null;
    const match = projectStatuses.find(
      s => (s.name ?? "").toLowerCase().replace(/[\s_]/g, "") === normalizedStatus
    );
    return match?.id ?? null;
  };

  const handleSaveProject = async (
    id: string,
    changes: Partial<CreateProjectData>
  ): Promise<boolean> => {
    if (!project) return false;

    const base: CreateProjectData = {
      name: project.name,
      address: project.address,
      city: project.city,
      state: project.state,
      postcode: project.postcode,
      property_type: project.property_type,
      start_date: project.start_date,
      target_end_date: project.target_end_date,
      status: project.status,
      statusId: resolveStatusId(),
      description: project.description,
      bal_rating: project.bal_rating,
      topography_type: project.topography_type,
      activities_visible_to_homeowner: project.activities_visible_to_homeowner,
    };

    const finalData: CreateProjectData = { ...base, ...changes };
    const success = await updateProject(id, finalData);

    if (success) {
      const newStatus = finalData.status ?? project.status ?? "";
      const normalizedNew = newStatus.toLowerCase().replace(/[\s_]/g, "");
      const newStatusId = finalData.statusId ??
        (normalizedNew
          ? projectStatuses.find(s => (s.name ?? "").toLowerCase().replace(/[\s_]/g, "") === normalizedNew)?.id ?? null
          : null);
      setProject({
        ...project,
        name: finalData.name,
        address: finalData.address,
        city: finalData.city,
        state: finalData.state,
        postcode: finalData.postcode,
        property_type: finalData.property_type,
        start_date: finalData.start_date ?? null,
        target_end_date: finalData.target_end_date ?? null,
        status: newStatus,
        statusId: newStatusId,
        description: finalData.description ?? null,
        bal_rating: finalData.bal_rating ?? null,
        topography_type: finalData.topography_type ?? null,
        activities_visible_to_homeowner:
          finalData.activities_visible_to_homeowner ??
          project.activities_visible_to_homeowner,
      });
    }

    return success;
  };

  const handleToggleHomeownerVisibility = async (visible: boolean) => {
    if (!project) return;
    await handleSaveProject(project.id, {
      activities_visible_to_homeowner: visible,
    });
  };

  if (authLoading || loading || projectLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h2 className="text-lg font-semibold">We couldn&rsquo;t load this project</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong fetching it. Please refresh, or go back and try again.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  const typeConfig = propertyTypeConfig[project.property_type];
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[project.status];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Sticky Project Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mr-3">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Projects
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${typeConfig.color}`}>
                <TypeIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {project.address}, {project.city} {project.state}
                  </span>
                  <Badge variant="outline">{typeConfig.label}</Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={status.color}>{status.label}</Badge>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${id}/report`)}>
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Report
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {canDevelop && (
                <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="px-2" aria-label="More actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue={defaultProjectTab} className="w-full">
          <TabsList className="mb-6">
            {showActivitiesTab && (
              <TabsTrigger value="activities">
                Activities ({activities.length})
              </TabsTrigger>
            )}
            {showRegistrationsTab && (
              <TabsTrigger value="registrations">
                Registrations
              </TabsTrigger>
            )}
            {showApprovalsTab && (
              <TabsTrigger value="approvals">
                Approvals ({approvalsCount})
              </TabsTrigger>
            )}
            {showComplianceTab && (
              <TabsTrigger value="compliance">
                Compliance documents
              </TabsTrigger>
            )}
            {showPricingTab && (
              <TabsTrigger value="pricing" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Pricing
              </TabsTrigger>
            )}
          </TabsList>

          {showActivitiesTab && (
          <TabsContent value="activities">
            {activitiesSummaryOnly ? (
              <ActivitySummary
                activities={activities}
                categories={categories}
                scheduleFeasibility={projectResponse?.data?.scheduleFeasibility}
                scheduleMessage={projectResponse?.data?.scheduleMessage}
                scheduleRecommendedEndDate={projectResponse?.data?.scheduleRecommendedEndDate}
              />
            ) : (
              <ActivityList
                activities={activities}
                categories={categories}
                loading={activitiesLoading}
                projectId={id!}
                approvals={approvals}
                activitiesVisibleToHomeowner={project.activities_visible_to_homeowner}
                onCreateActivity={createActivity}
                onUpdateActivity={updateActivity}
                onDeleteActivity={deleteActivity}
                onFetchUpdates={fetchUpdates}
                onPostUpdate={postUpdate}
                onRequestApproval={requestApproval}
                onToggleHomeownerVisibility={handleToggleHomeownerVisibility}
                onCreateCategory={createCategory}
                onUpdateCategory={updateCategory}
                onDeleteCategory={deleteCategory}
                onRefresh={fetchActivities}
                onRefreshCategories={refetchCategories}
                scheduleFeasibility={projectResponse?.data?.scheduleFeasibility}
                scheduleMessage={projectResponse?.data?.scheduleMessage}
                scheduleRecommendedEndDate={projectResponse?.data?.scheduleRecommendedEndDate}
              />
            )}
          </TabsContent>
          )}

          {showRegistrationsTab && (
          <TabsContent value="registrations">
            <ProjectRegistrations projectId={id!} />
          </TabsContent>
          )}

          {showApprovalsTab && (
          <TabsContent value="approvals">
            <ApprovalsList
              approvals={approvals}
              activities={activities}
              loading={approvalsLoading}
              projectId={id!}
            />
          </TabsContent>
          )}

          {showComplianceTab && (
          <TabsContent value="compliance">
            <ProjectComplianceSection
              projectId={id!}
              accessRole={projectResponse?.data?.accessRole}
              matrixReferenceVersion={projectResponse?.data?.matrixReferenceVersion}
              jurisdiction={projectResponse?.data?.complianceJurisdiction}
              initialFeatures={project ? {
                hasGas: project.has_gas ?? undefined,
                hasPool: project.has_pool ?? undefined,
                hasLift: project.has_lift ?? undefined,
                isStrata: project.is_strata ?? undefined,
                hasDuctedHvac: project.has_ducted_hvac ?? undefined,
              } : undefined}
            />
          </TabsContent>
          )}

          {showPricingTab && (
            <TabsContent value="pricing">
              <ProjectPricing
                project={project}
                activities={activities}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onSave={handleSaveProject}
      />

      {/* Delete project + all its registrations (guarded server-side). */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-medium">{project?.name}</span> and{" "}
              <span className="font-medium">all of its registrations</span>. This can only be done
              while the project is in progress — it is blocked once the project is completed or any
              unit has been handed over to a homeowner. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deletingProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingProject ? "Deleting…" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share with a developer organisation (moved from a tab to this dialog). */}
      {canDevelop && (
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Share project</DialogTitle>
            </DialogHeader>
            <ProjectSharesCard projectId={id!} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProjectDetail;
