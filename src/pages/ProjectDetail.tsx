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
import { useProjectByIdQuery, type BuilderProjectApi } from "@/store/api/projects";
import { useGetProjectApprovalsQuery } from "@/store/api/approvals";
import { useGetStatusesByModuleQuery } from "@/store/api/status";
import { ActivityList } from "@/components/projects/ActivityList";
import { ApprovalsList } from "@/components/projects/ApprovalsList";
import { ProjectRegistrations } from "@/components/projects/ProjectRegistrations";
import { ProjectPricing } from "@/components/projects/ProjectPricing";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
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
  DollarSign
} from "lucide-react";

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
  const { user, loading: authLoading } = useAuth();
  const { updateProject } = useProjects();
  const { activities, loading: activitiesLoading, fetchActivities, createActivity, updateActivity, deleteActivity, fetchUpdates, postUpdate } = useActivities(id);
  const { categories, createCategory, updateCategory, deleteCategory, refetch: refetchCategories } = useActivityCategories(id);
  const { approvals, loading: approvalsLoading, fetchApprovals, requestApproval, respondToApproval } = useApprovals(id);
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const { data: statusResponse } = useGetStatusesByModuleQuery({ module: "PROJECT" });
  const projectStatuses = statusResponse?.data ?? [];

  useEffect(() => {
    if (!authLoading && !user && !hasBuilderAuth()) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!projectResponse?.data || !id) return;
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
    };
    setProject(mapped);
    fetchActivities();
    fetchApprovals();
    setLoading(false);
  }, [projectResponse, id, fetchActivities, fetchApprovals]);

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
    return null;
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
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="activities">
              Activities ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="registrations">
              Registrations
            </TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals ({approvalsCount})
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="activities">
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
            />
          </TabsContent>
          
          <TabsContent value="registrations">
            <ProjectRegistrations projectId={id!} />
          </TabsContent>
          
          <TabsContent value="approvals">
            <ApprovalsList
              approvals={approvals}
              activities={activities}
              loading={approvalsLoading}
              projectId={id!}
            />
          </TabsContent>
          
          <TabsContent value="pricing">
            <ProjectPricing
              project={project}
              activities={activities}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onSave={handleSaveProject}
      />
    </div>
  );
};

export default ProjectDetail;
