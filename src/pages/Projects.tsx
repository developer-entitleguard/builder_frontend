import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useProjects, Project, ProjectStatus, PropertyType } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { canManageProjects } from "@/lib/roles";
import { ImportProjectsDialog } from "@/components/projects/ImportProjectsDialog";
import {
  Plus,
  FolderOpen,
  Home,
  Building2,
  Building,
  LayoutGrid,
  Hammer,
  PlusCircle,
  Settings,
  Calendar,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";

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

const ProjectCard = ({ project }: { project: Project }) => {
  const typeConfig = propertyTypeConfig[project.property_type];
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[project.status];

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${typeConfig.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className={status.color}>
              {status.label}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-lg mb-1 text-foreground">{project.name}</h3>
          
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            <span className="truncate">{project.address}, {project.city}</span>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {typeConfig.label}
            </Badge>
            {project.target_end_date && (
              <span className="ml-2 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {format(new Date(project.target_end_date), 'MMM yyyy')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const EmptyState = ({ onImportClick, canImport }: { onImportClick?: () => void; canImport: boolean }) => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Get started by creating your first project to manage activities and track progress.
      </p>
      <div className="flex justify-center gap-2">
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Project
        </Button>
        {canImport && onImportClick && (
          <Button variant="outline" onClick={onImportClick}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import from CSV
          </Button>
        )}
      </div>
    </div>
  );
};

const Projects = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentProjects, completedProjects, loading, fetchProjects } = useProjects();
  const { effectiveOrganization, builderRole } = useOrganization();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const canImport = canManageProjects(builderRole);

  useEffect(() => {
    // Redirect only when neither Supabase user nor builder JWT is present
    if (!authLoading && !user && !hasBuilderAuth()) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Trigger projects fetch for both Supabase and builder-authenticated flows
    if (user || hasBuilderAuth()) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

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

  const hasProjects = currentProjects.length > 0 || completedProjects.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your construction projects</p>
          </div>
          <div className="flex items-center gap-2">
            {canImport && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import Projects from CSV
              </Button>
            )}
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
          </div>
        </div>

        {!hasProjects ? (
          <EmptyState canImport={canImport} onImportClick={() => setImportOpen(true)} />
        ) : (
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="current">
                Current Projects ({currentProjects.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedProjects.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="current">
              {currentProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No current projects. All projects are completed!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed">
              {completedProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No completed projects yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {canImport && (
        <ImportProjectsDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onCompleted={fetchProjects}
        />
      )}
    </div>
  );
};

export default Projects;
