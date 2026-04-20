import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useDashboardRegistrationsQuery,
  useGetStatusesByTypeQuery,
} from "@/store/api";
import Header from "@/components/Header";
import { RegistrationTypeDialog } from "@/components/RegistrationTypeDialog";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  Send,
  Users,
  Home,
  FolderKanban,
  Filter,
  KeyRound,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

interface HomeownerRegistration {
  id: string;
  customer_name: string;
  customer_email: string;
  property_address: string;
  property_city: string;
  property_state: string;
  project_id: string | null;
  project_name: string;
  status: string;
  status_name: string | null;
  created_at: string;
  entitlement_sent_at: string | null;
  settlement_date: string | null;
}

const HANDED_STATUS_KEY = "handed";

const isHanded = (reg: HomeownerRegistration): boolean =>
  reg.status === HANDED_STATUS_KEY
  || (reg.status_name ?? "").toUpperCase() === "HANDED";

const STATUS_ORDER: string[] = [
  "draft",
  "created",
  "documents_pending",
  "ready_for_review",
  "sent",
  "delivered",
];

const prettyStatusLabel = (reg: HomeownerRegistration): string => {
  const raw = reg.status_name ?? reg.status;
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

interface ProjectRef {
  id: string;
  name: string;
}

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

const Registrations = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const isAuthenticated = !!user || hasBuilderAuth();

  const [registrations, setRegistrations] = useState<HomeownerRegistration[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const builderId = useMemo(() => {
    const raw = localStorage.getItem("userData");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.userInfo?.builderOrganization?.id) return parsed.userInfo.builderOrganization.id;
        if (parsed.builderOrganization?.id) return parsed.builderOrganization.id;
      } catch {
        /* ignore */
      }
    }
    return organization?.id ?? null;
  }, [organization?.id]);

  const { data: statusesData } = useGetStatusesByTypeQuery({ type: "BUILDER" });
  const {
    data: ownerData,
    isLoading: isLoadingOwner,
    error: ownerError,
    refetch: refetchOwner,
  } = useDashboardRegistrationsQuery(
    { builderId: builderId || "", type: "owner" },
    { skip: !builderId },
  );
  const { data: projectData, refetch: refetchProject } = useDashboardRegistrationsQuery(
    { builderId: builderId || "", type: "project" },
    { skip: !builderId },
  );

  const fetchRegistrations = useCallback(() => {
    refetchOwner();
    refetchProject();
  }, [refetchOwner, refetchProject]);

  useEffect(() => {
    if (!builderId) return;
    if (isLoadingOwner) return;
    const raw = ownerData?.data;
    if (Array.isArray(raw)) {
      const mapped: HomeownerRegistration[] = (
        raw as Array<{
          id: string;
          firstName?: string;
          lastName?: string;
          email?: string;
          address?: string;
          city?: string;
          state?: string;
          projectName?: string;
          statusName?: string;
          createdAt?: string;
          settlementDate?: string | null;
          project_id?: string | null;
        }>
      ).map((item) => {
        let status = "draft";
        if (item.statusName) {
          const s = item.statusName.toLowerCase();
          if (s === "entitlement") status = "documents_pending";
          else if (s === "sent" || s === "delivered") status = "sent";
          else if (s === "ready_for_review" || s === "ready for review") status = "ready_for_review";
          else status = s.replace(/\s+/g, "_");
        }
        return {
          id: item.id,
          customer_name: `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "—",
          customer_email: item.email ?? "",
          property_address: item.address ?? "",
          property_city: item.city ?? "",
          property_state: item.state ?? "",
          project_id: item.project_id ?? null,
          project_name: item.projectName ?? "No Project",
          status,
          status_name: item.statusName ?? null,
          created_at: item.createdAt ?? new Date().toISOString(),
          entitlement_sent_at: item.statusName === "SENT" ? item.createdAt ?? null : null,
          settlement_date: item.settlementDate ?? null,
        };
      });
      setRegistrations(mapped);
      const projectSet = new Map<string, ProjectRef>();
      mapped.forEach((r) => {
        if (r.project_id && r.project_name && !projectSet.has(r.project_id)) {
          projectSet.set(r.project_id, { id: r.project_id, name: r.project_name });
        }
      });
      setProjects(Array.from(projectSet.values()));
    }
  }, [builderId, isLoadingOwner, ownerData]);

  useEffect(() => {
    if (ownerError) {
      console.warn("Error loading registrations", ownerError);
    }
  }, [ownerError]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/auth");
  }, [isAuthenticated, navigate]);

  const getStatusBadge = (status: string, statusName?: string | null) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      documents_pending: { label: "Documents Pending", variant: "outline" as const },
      ready_for_review: { label: "Ready for Review", variant: "default" as const },
      sent: { label: "Sent", variant: "default" as const },
      delivered: { label: "Delivered", variant: "default" as const },
      handed_over: { label: "Handed Over", variant: "default" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const label =
      statusName && statusName.trim() !== ""
        ? statusName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : config.label;
    return (
      <Badge
        variant={config.variant}
        className={status === "handed_over" ? "bg-green-600 text-white" : ""}
      >
        {label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "documents_pending":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "ready_for_review":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "sent":
        return <Send className="h-4 w-4 text-green-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "handed_over":
        return <KeyRound className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      reg.customer_name.toLowerCase().includes(q) ||
      reg.customer_email.toLowerCase().includes(q) ||
      reg.property_address.toLowerCase().includes(q) ||
      reg.project_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || reg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectedRegistrations(checked ? filteredRegistrations.map((r) => r.id) : []);
  };

  const handleSelectRegistration = (id: string, checked: boolean) => {
    setSelectedRegistrations((prev) =>
      checked ? [...prev, id] : prev.filter((regId) => regId !== id),
    );
  };

  const getProjectName = (projectId: string | null): string => {
    if (!projectId) return "No Project";
    return projects.find((p) => p.id === projectId)?.name || "Unknown Project";
  };

  const apiStatusToFilterValue = (name: string): string => {
    const n = name.toUpperCase().replace(/\s+/g, " ");
    if (n === "DRAFT") return "draft";
    if (n === "ENTITLEMENT") return "documents_pending";
    if (n === "SENT") return "sent";
    if (n === "READY FOR REVIEW") return "ready_for_review";
    if (n === "CREATED") return "created";
    if (n === "DELIVERED") return "delivered";
    return name.toLowerCase().replace(/\s+/g, "_");
  };

  const statusOptions = useMemo(() => {
    const list = statusesData?.data ?? [];
    return list.map((s) => ({
      value: apiStatusToFilterValue(s.name),
      label: s.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [statusesData?.data]);

  // ── Split handed vs. still-in-progress ──
  const openRegistrations = filteredRegistrations.filter((r) => !isHanded(r));
  const completedRegistrations = useMemo(
    () =>
      [...filteredRegistrations]
        .filter(isHanded)
        .sort((a, b) => {
          const aT = a.settlement_date ? new Date(a.settlement_date).getTime() : 0;
          const bT = b.settlement_date ? new Date(b.settlement_date).getTime() : 0;
          return bT - aT; // latest settlement first
        }),
    [filteredRegistrations],
  );

  // ── By Status groupings (excludes Handed) ──
  const statusGroups = useMemo(() => {
    const grouped: Record<string, { label: string; statusKey: string; registrations: HomeownerRegistration[] }> = {};
    for (const reg of openRegistrations) {
      const key = reg.status || "unknown";
      const label = prettyStatusLabel(reg);
      if (!grouped[key]) {
        grouped[key] = { label, statusKey: key, registrations: [] };
      }
      grouped[key].registrations.push(reg);
    }
    // Order by STATUS_ORDER, then any unknown keys alphabetically at the end.
    return Object.values(grouped).sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.statusKey);
      const bi = STATUS_ORDER.indexOf(b.statusKey);
      if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [openRegistrations]);

  // ── By Project groupings (excludes Handed) ──
  const projectGroups = useMemo(() => {
    const grouped: Record<string, { name: string; registrations: HomeownerRegistration[] }> = {};
    for (const reg of openRegistrations) {
      const projectKey = reg.project_id || reg.project_name || "no-project";
      const projectName = reg.project_name || getProjectName(reg.project_id);
      if (!grouped[projectKey]) {
        grouped[projectKey] = { name: projectName, registrations: [] };
      }
      grouped[projectKey].registrations.push(reg);
    }
    return grouped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRegistrations, projects]);

  // ── Expand / collapse per group ──
  const [collapsedStatus, setCollapsedStatus] = useState<Record<string, boolean>>({});
  const [collapsedProject, setCollapsedProject] = useState<Record<string, boolean>>({});
  const toggleStatusGroup = (k: string) =>
    setCollapsedStatus((prev) => ({ ...prev, [k]: !prev[k] }));
  const toggleProjectGroup = (k: string) =>
    setCollapsedProject((prev) => ({ ...prev, [k]: !prev[k] }));

  // Suppress unused-var warning for projectData (the query is still run for fallback behaviour).
  void projectData;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Registrations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track homeowner warranty registrations across your projects.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search homeowners..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            New Registration
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Homeowner Registrations</CardTitle>
            <CardDescription>
              Manage and track your homeowner warranty registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="by-status" className="w-full">
              <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
                <TabsTrigger value="by-status" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  By Status
                </TabsTrigger>
                <TabsTrigger value="by-project" className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  By Project
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="by-status" className="mt-0">
                {openRegistrations.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No open registrations
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Handed properties move to the Completed tab. Create a new registration to get started.
                    </p>
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Registration
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {statusGroups.map((group) => {
                      const collapsed = !!collapsedStatus[group.statusKey];
                      const groupIds = group.registrations.map((r) => r.id);
                      const allSelected =
                        groupIds.length > 0 &&
                        groupIds.every((id) => selectedRegistrations.includes(id));
                      const someSelected =
                        groupIds.some((id) => selectedRegistrations.includes(id)) &&
                        !allSelected;
                      const toggleGroupSelection = (checked: boolean) => {
                        setSelectedRegistrations((prev) =>
                          checked
                            ? Array.from(new Set([...prev, ...groupIds]))
                            : prev.filter((id) => !groupIds.includes(id)),
                        );
                      };
                      return (
                        <Card key={group.statusKey} className="border">
                          <CardHeader
                            className="cursor-pointer select-none"
                            onClick={() => toggleStatusGroup(group.statusKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                  onCheckedChange={(checked) =>
                                    toggleGroupSelection(checked === true)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Select all ${group.label}`}
                                />
                                {collapsed ? (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(group.statusKey)}
                                  <CardTitle className="text-base">{group.label}</CardTitle>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {group.registrations.length}
                              </Badge>
                            </div>
                          </CardHeader>
                          {!collapsed && (
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                {group.registrations.map((registration) => (
                                  <RegistrationRow
                                    key={registration.id}
                                    registration={registration}
                                    selected={selectedRegistrations.includes(registration.id)}
                                    onToggleSelect={(checked) =>
                                      handleSelectRegistration(registration.id, checked)
                                    }
                                    onOpen={() => navigate(`/registration/${registration.id}`)}
                                    onEdit={() => navigate(`/onboarding?id=${registration.id}`)}
                                    getStatusIcon={getStatusIcon}
                                    getStatusBadge={getStatusBadge}
                                    getProjectName={getProjectName}
                                  />
                                ))}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="by-project" className="mt-0">
                {Object.keys(projectGroups).length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No open projects
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Registrations that have been handed appear under Completed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(projectGroups)
                      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                      .map(([projectKey, projectData]) => {
                        const projectIds = projectData.registrations.map((r) => r.id);
                        const allSelected =
                          projectIds.length > 0 &&
                          projectIds.every((id) => selectedRegistrations.includes(id));
                        const someSelected =
                          projectIds.some((id) => selectedRegistrations.includes(id)) &&
                          !allSelected;
                        const toggleProjectSelection = (checked: boolean) => {
                          setSelectedRegistrations((prev) =>
                            checked
                              ? Array.from(new Set([...prev, ...projectIds]))
                              : prev.filter((id) => !projectIds.includes(id)),
                          );
                        };
                        const collapsed = !!collapsedProject[projectKey];
                        return (
                          <Card key={projectKey} className="border">
                            <CardHeader
                              className="cursor-pointer select-none"
                              onClick={() => toggleProjectGroup(projectKey)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                    onCheckedChange={(checked) =>
                                      toggleProjectSelection(checked === true)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Select all in ${projectData.name}`}
                                  />
                                  {collapsed ? (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Building2 className="h-5 w-5 text-primary" />
                                  <div>
                                    <CardTitle className="text-base">
                                      {projectData.name}
                                    </CardTitle>
                                    <CardDescription>
                                      {projectData.registrations.length} homeowner
                                      {projectData.registrations.length !== 1 ? "s" : ""}
                                    </CardDescription>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {
                                    projectData.registrations.filter(
                                      (r) => r.status === "sent" || r.status === "delivered",
                                    ).length
                                  }{" "}
                                  sent
                                </Badge>
                              </div>
                            </CardHeader>
                            {!collapsed && (
                              <CardContent className="pt-0">
                                <div className="space-y-3">
                                  {projectData.registrations.map((registration) => (
                                    <RegistrationRow
                                      key={registration.id}
                                      registration={registration}
                                      selected={selectedRegistrations.includes(registration.id)}
                                      onToggleSelect={(checked) =>
                                        handleSelectRegistration(registration.id, checked)
                                      }
                                      onOpen={() => navigate(`/registration/${registration.id}`)}
                                      onEdit={() => navigate(`/onboarding?id=${registration.id}`)}
                                      getStatusIcon={getStatusIcon}
                                      getStatusBadge={getStatusBadge}
                                      getProjectName={getProjectName}
                                      compact
                                    />
                                  ))}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-0">
                {completedRegistrations.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No handed properties yet
                    </h3>
                    <p className="text-muted-foreground">
                      Completed handovers will appear here, sorted by latest settlement date.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Customer</th>
                          <th className="text-left px-4 py-2 font-medium">Project</th>
                          <th className="text-left px-4 py-2 font-medium">Address</th>
                          <th className="text-left px-4 py-2 font-medium">Settlement</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {completedRegistrations.map((reg) => (
                          <tr
                            key={reg.id}
                            className="border-t hover:bg-accent/40 cursor-pointer"
                            onClick={() => navigate(`/registration/${reg.id}`)}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">
                                {reg.customer_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {reg.customer_email}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {reg.project_name || getProjectName(reg.project_id)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {[reg.property_address, reg.property_city, reg.property_state]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {reg.settlement_date
                                ? new Date(reg.settlement_date).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/registration/${reg.id}`);
                                }}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <RegistrationTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchRegistrations}
      />

      <BulkActionsBar
        selectedCount={selectedRegistrations.length}
        selectedIds={selectedRegistrations}
        onClearSelection={() => setSelectedRegistrations([])}
        onSuccess={fetchRegistrations}
      />
    </div>
  );
};

interface RegistrationRowProps {
  registration: HomeownerRegistration;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onOpen: () => void;
  onEdit: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string, statusName?: string | null) => React.ReactNode;
  getProjectName: (projectId: string | null) => string;
  /** Compact layout drops the secondary "Created / Sent" meta column. */
  compact?: boolean;
}

const RegistrationRow = ({
  registration,
  selected,
  onToggleSelect,
  onOpen,
  onEdit,
  getStatusIcon,
  getStatusBadge,
  getProjectName,
  compact = false,
}: RegistrationRowProps) => {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onToggleSelect(checked === true)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${registration.customer_name}`}
      />
      <div className="flex items-center justify-between flex-1 cursor-pointer" onClick={onOpen}>
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {getStatusIcon(registration.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground truncate">
                {registration.customer_name}
              </h4>
              {!compact && (
                <Badge variant="outline" className="text-xs">
                  {registration.project_name || getProjectName(registration.project_id)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {registration.customer_email}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              📍 {registration.property_address}
              {registration.property_city ? `, ${registration.property_city}` : ""}
              {registration.property_state ? `, ${registration.property_state}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          {getStatusBadge(registration.status, registration.status_name)}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            {(registration.status_name ?? "").toUpperCase() === "HANDED"
              ? "View"
              : "Edit"}
          </Button>
          {!compact && (
            <div className="text-right whitespace-nowrap">
              <p className="text-xs text-muted-foreground">
                Created {new Date(registration.created_at).toLocaleDateString()}
              </p>
              {registration.entitlement_sent_at && (
                <p className="text-xs text-muted-foreground">
                  Sent {new Date(registration.entitlement_sent_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registrations;
