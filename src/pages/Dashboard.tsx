import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useAcceptBuilderTermsMutation,
  useGetBuilderTermsStatusQuery,
  useGetDashboardCountQuery,
  useGetLatestTermsQuery,
} from "@/store/api";
import Header from "@/components/Header";
import GettingStartedChecklist from "@/components/dashboards/GettingStartedChecklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Clock,
  FileBarChart,
  MessageSquare,
  Package,
  Plus,
  Send,
  Settings,
  Users,
} from "lucide-react";
import { BUILDER_ROLES, readBuilderRoleFromStorage } from "@/lib/roles";

const hasBuilderAuth = (): boolean => {
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!parsed?.jwt;
  } catch {
    return false;
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const { organization, builderRole } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = !!user || hasBuilderAuth();
  const isAdmin = (builderRole ?? readBuilderRoleFromStorage()) === BUILDER_ROLES.ADMINISTRATOR;

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

  const { data: countData } = useGetDashboardCountQuery(
    { builderId: builderId || "" },
    { skip: !builderId },
  );

  // -- Terms acceptance --
  const { data: termsStatusData } = useGetBuilderTermsStatusQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });
  const shouldFetchLatestTerms =
    isAuthenticated &&
    termsStatusData?.data &&
    termsStatusData.data.acceptedLatestVersion === false;
  const { data: latestTermsData } = useGetLatestTermsQuery(undefined, {
    skip: !shouldFetchLatestTerms,
  });
  const [acceptTerms, { isLoading: acceptingTerms }] = useAcceptBuilderTermsMutation();
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!termsStatusData?.data) return;
    if (
      termsStatusData.data.acceptedLatestVersion === false &&
      latestTermsData?.data
    ) {
      setTermsDialogOpen(true);
    }
  }, [isAuthenticated, termsStatusData, latestTermsData]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/auth");
  }, [isAuthenticated, navigate]);

  const stats = useMemo(() => {
    const d = countData?.data;
    return {
      total: d?.totalHomeowners ?? 0,
      sent: d?.entitlementsSent ?? 0,
      pending: d?.pending ?? 0,
      ready: d?.readyForReview ?? 0,
    };
  }, [countData?.data]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your builder organisation.
          </p>
        </div>

        <div className="mb-8">
          <GettingStartedChecklist />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Homeowners
                  </p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Send className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Entitlements Sent
                  </p>
                  <p className="text-2xl font-bold text-foreground">{stats.sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Ready for Review
                  </p>
                  <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickAction
            icon={<Package className="h-8 w-8 text-blue-500" />}
            title="Manage Items"
            description="Add and organize master item list"
            cta="View"
            to="/items"
          />
          <QuickAction
            icon={<MessageSquare className="h-8 w-8 text-green-500" />}
            title="Homeowner Queries"
            description="Respond to homeowner questions"
            cta="View"
            to="/queries"
          />
          <QuickAction
            icon={<Settings className="h-8 w-8 text-orange-500" />}
            title="Organization Admin"
            description="Manage org details and users"
            cta="Manage"
            to="/admin"
          />
          <QuickAction
            icon={<Plus className="h-8 w-8 text-purple-500" />}
            title="Registrations"
            description="Manage homeowner warranty registrations"
            cta="Open"
            to="/registrations"
          />
          {isAdmin && (
            <QuickAction
              icon={<FileBarChart className="h-8 w-8 text-indigo-500" />}
              title="Report"
              description="Org-wide stats, tickets, queries and project reports"
              cta="View"
              to="/report"
            />
          )}
        </div>
      </main>

      <Dialog
        open={termsDialogOpen}
        onOpenChange={(open) => {
          if (!open && termsStatusData?.data?.acceptedLatestVersion === false) {
            return;
          }
          setTermsDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] bg-background flex flex-col [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto border rounded-md p-4 bg-muted/30 text-sm whitespace-pre-wrap">
            {latestTermsData?.data?.content ?? "Loading latest terms..."}
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={async () => {
                const versionId = latestTermsData?.data?.id;
                if (!versionId) return;
                try {
                  await acceptTerms({ versionId }).unwrap();
                  toast({
                    title: "Terms accepted",
                    description: "You have accepted the latest terms and conditions.",
                  });
                  setTermsDialogOpen(false);
                } catch (error: unknown) {
                  const message =
                    error && typeof error === "object" && "data" in error
                      ? (error as { data?: { message?: string } }).data?.message
                      : error instanceof Error
                        ? error.message
                        : "Failed to accept terms.";
                  toast({
                    title: "Error accepting terms",
                    description: String(message),
                    variant: "destructive",
                  });
                }
              }}
              disabled={acceptingTerms || !latestTermsData?.data?.id}
            >
              {acceptingTerms ? "Accepting..." : "Accept & Agree"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  to: string;
}

const QuickAction = ({ icon, title, description, cta, to }: QuickActionProps) => {
  return (
    <Link to={to} className="block h-full">
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-2">
            {icon}
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
            <Button variant="ghost" size="sm" className="bg-primary text-primary-foreground mt-2">
              {cta}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Dashboard;
