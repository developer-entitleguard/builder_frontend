import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import OrganizationGate from "@/components/OrganizationGate";
import RoleGate from "@/components/RoleGate";
import ModuleGate from "@/components/ModuleGate";
import { BUILDER_ROLES } from "@/lib/roles";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/RoleDashboard";
import Registrations from "./pages/Registrations";
import Onboarding from "./pages/Onboarding";
import ItemsManagement from "./pages/ItemsManagement";
import QueriesManagement from "./pages/QueriesManagement";
import RegistrationDetail from "./pages/RegistrationDetail";
import Admin from "./pages/Admin";
import TermsVersions from "./pages/TermsVersions";
import NotFound from "./pages/NotFound";
import ConsentConfirmation from "./pages/ConsentConfirmation";
import Projects from "./pages/Projects";
import ProjectCreate from "./pages/ProjectCreate";
import Customers from "./pages/Customers";
import Quotes from "./pages/Quotes";
import QuoteCreate from "./pages/QuoteCreate";
import QuoteDetail from "./pages/QuoteDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Payments from "./pages/Payments";
import PublicQuote from "./pages/PublicQuote";
import BuilderOnboarding from "./pages/BuilderOnboarding";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectReport from "./pages/ProjectReport";
import OrgReport from "./pages/OrgReport";
import ApprovalDetail from "./pages/ApprovalDetail";
import AcceptInvitation from "./pages/AcceptInvitation";
import ApprovalResponse from "./pages/ApprovalResponse";
import QueryDetail from "./pages/QueryDetail";
import CreateQuery from "./pages/CreateQuery";
import VendorQuery from "./pages/VendorQuery";
import ComplianceUpload from "./pages/ComplianceUpload";
import Signup from "./pages/Signup";
import QueryRedirect from "./pages/QueryRedirect";
import MySchedule from "./pages/MySchedule";
import MyAssignments from "./pages/MyAssignments";
import MyAssignmentDetail from "./pages/MyAssignmentDetail";
import TicketsTriage from "./pages/TicketsTriage";
import TicketDetail from "./pages/TicketDetail";
import Notifications from "./pages/Notifications";
import AdminProtectedRoute from "@/components/admin-portal/AdminProtectedRoute";
import AdminLogin from "./pages/admin-portal/AdminLogin";
import AdminOrgList from "./pages/admin-portal/AdminOrgList";
import AdminOrgCreate from "./pages/admin-portal/AdminOrgCreate";
import AdminOrgDetail from "./pages/admin-portal/AdminOrgDetail";
import AdminAdmins from "./pages/admin-portal/AdminAdmins";
import AdminRecords from "./pages/admin-portal/AdminRecords";
import AdminAnalytics from "./pages/admin-portal/AdminAnalytics";
import { useValidateTokenQuery } from "@/store/api";

const queryClient = new QueryClient();

// Consider user authenticated if Supabase session OR builder login (userData.jwt in localStorage)
const getBuilderJwt = (): { token: string | null; hasJwt: boolean } => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return { token: null, hasJwt: false };
    const parsed = JSON.parse(userData);
    const jwt = parsed?.jwt as string | undefined;
    return jwt ? { token: jwt, hasJwt: true } : { token: null, hasJwt: false };
  } catch {
    return { token: null, hasJwt: false };
  }
};

const SessionExpiredScreen = () => {
  const handleSignOut = () => {
    try {
      localStorage.removeItem("userData");
    } catch {
      // ignore
    }
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative z-10 max-w-md w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Session expired</h2>
        <p className="text-sm text-muted-foreground">
          Your session is no longer valid. Please sign in again to continue.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { token: builderToken, hasJwt } = getBuilderJwt();
  const {
    data: tokenValidation,
    isLoading: tokenLoading,
    isError: tokenError,
  } = useValidateTokenQuery(
    { token: builderToken ?? "" },
    { skip: !hasJwt }
  );

  if (hasJwt) {
    if (tokenLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          Loading...
        </div>
      );
    }

    const expired =
      tokenValidation?.data?.expired === true ||
      (tokenValidation?.message || "").toLowerCase().includes("invalid") ||
      (tokenValidation?.message || "").toLowerCase().includes("expired");

    if (tokenError || expired) {
      return <SessionExpiredScreen />;
    }

    return <OrganizationGate>{children}</OrganizationGate>;
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <OrganizationGate>{children}</OrganizationGate>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/resetPassword" element={<ResetPassword />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/registrations" element={
                <ProtectedRoute>
                  <RoleGate roles={[
                    BUILDER_ROLES.ADMINISTRATOR,
                    BUILDER_ROLES.PROJECT_MANAGER,
                    BUILDER_ROLES.CUSTOMER_SUPPORT,
                  ]}>
                    <Registrations />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/items" element={
                <ProtectedRoute>
                  <ItemsManagement />
                </ProtectedRoute>
              } />
              {/* Catalog → Terms & Conditions (PRD_Org_Terms_And_Conditions Phase 4 nav restructure) */}
              <Route path="/terms-versions" element={
                <ProtectedRoute>
                  <TermsVersions />
                </ProtectedRoute>
              } />
              <Route path="/queries" element={
                <ProtectedRoute>
                  <QueriesManagement />
                </ProtectedRoute>
              } />
              <Route path="/queries/new" element={
                <ProtectedRoute>
                  <CreateQuery />
                </ProtectedRoute>
              } />
              <Route path="/queries/:id" element={
                <ProtectedRoute>
                  <QueryDetail />
                </ProtectedRoute>
              } />
              {/* Legacy routes — redirect to unified query detail */}
              <Route path="/pendingQueries" element={<ProtectedRoute><QueryRedirect /></ProtectedRoute>} />
              <Route path="/awaitingAction" element={<ProtectedRoute><QueryRedirect /></ProtectedRoute>} />
              <Route path="/queriesComplete" element={<ProtectedRoute><QueryRedirect /></ProtectedRoute>} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR]}>
                    <Admin />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/registration/:id" element={
                <ProtectedRoute>
                  <RegistrationDetail />
                </ProtectedRoute>
              } />
              {/* Sales module (SALES bolt-on) — customers, quotes, invoices, payments. */}
              <Route path="/customers" element={
                <ProtectedRoute>
                  <ModuleGate module="SALES">
                    <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                      <Customers />
                    </RoleGate>
                  </ModuleGate>
                </ProtectedRoute>
              } />
              <Route path="/quotes" element={
                <ProtectedRoute>
                  <ModuleGate module="SALES">
                    <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                      <Quotes />
                    </RoleGate>
                  </ModuleGate>
                </ProtectedRoute>
              } />
              <Route path="/quotes/new" element={
                <ProtectedRoute>
                  <ModuleGate module="SALES">
                    <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                      <QuoteCreate />
                    </RoleGate>
                  </ModuleGate>
                </ProtectedRoute>
              } />
              <Route path="/quotes/:id" element={
                <ProtectedRoute>
                  <ModuleGate module="SALES">
                    <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                      <QuoteDetail />
                    </RoleGate>
                  </ModuleGate>
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute>
                  <ModuleGate module="SALES">
                    <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                      <Invoices />
                    </RoleGate>
                  </ModuleGate>
                </ProtectedRoute>
              } />
              <Route path="/invoices/:id" element={
                <ProtectedRoute>
                  <ModuleGate module="SALES">
                    <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                      <InvoiceDetail />
                    </RoleGate>
                  </ModuleGate>
                </ProtectedRoute>
              } />
              <Route path="/payments" element={
                <ProtectedRoute>
                  <ModuleGate module="SALES">
                    <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                      <Payments />
                    </RoleGate>
                  </ModuleGate>
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
              <Route path="/projects/new" element={
                <ProtectedRoute>
                  <ProjectCreate />
                </ProtectedRoute>
              } />
              {/* Bulk onboarding — gated to ADMINISTRATOR / PROJECT_MANAGER. */}
              <Route path="/onboarding/bulk" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER]}>
                    <BuilderOnboarding />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId/approvals/:approvalId" element={
                <ProtectedRoute>
                  <ApprovalDetail />
                </ProtectedRoute>
              } />
              <Route path="/projects/:id" element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              } />
              {/* Per-project management report — admin only. */}
              <Route path="/projects/:id/report" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR]}>
                    <ProjectReport />
                  </RoleGate>
                </ProtectedRoute>
              } />
              {/* Org-level management report — admin only. */}
              <Route path="/report" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR]}>
                    <OrgReport />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/tickets" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.CUSTOMER_SUPPORT]}>
                    <TicketsTriage />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/tickets/:id" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.CUSTOMER_SUPPORT]}>
                    <TicketDetail />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/my-schedule" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.INTERNAL_VENDOR, BUILDER_ROLES.ADMINISTRATOR]}>
                    <MySchedule />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/my-assignments" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.EXTERNAL_VENDOR, BUILDER_ROLES.INTERNAL_VENDOR, BUILDER_ROLES.ADMINISTRATOR]}>
                    <MyAssignments />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/my-assignments/:queryId" element={
                <ProtectedRoute>
                  <RoleGate roles={[BUILDER_ROLES.EXTERNAL_VENDOR, BUILDER_ROLES.INTERNAL_VENDOR, BUILDER_ROLES.ADMINISTRATOR]}>
                    <MyAssignmentDetail />
                  </RoleGate>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <RoleGate roles={[
                    BUILDER_ROLES.ADMINISTRATOR,
                    BUILDER_ROLES.CUSTOMER_SUPPORT,
                    BUILDER_ROLES.PROJECT_MANAGER,
                  ]}>
                    <Notifications />
                  </RoleGate>
                </ProtectedRoute>
              } />
              {/* Platform super-admin portal — fully separate auth (adminData),
                  outside ProtectedRoute / OrganizationProvider. Designed to lift
                  into a standalone frontend later. */}
              <Route path="/platform-admin" element={<Navigate to="/platform-admin/orgs" replace />} />
              <Route path="/platform-admin/login" element={<AdminLogin />} />
              <Route path="/platform-admin/orgs" element={
                <AdminProtectedRoute><AdminOrgList /></AdminProtectedRoute>
              } />
              <Route path="/platform-admin/orgs/:orgType/new" element={
                <AdminProtectedRoute><AdminOrgCreate /></AdminProtectedRoute>
              } />
              <Route path="/platform-admin/orgs/:orgType/:id" element={
                <AdminProtectedRoute><AdminOrgDetail /></AdminProtectedRoute>
              } />
              <Route path="/platform-admin/admins" element={
                <AdminProtectedRoute><AdminAdmins /></AdminProtectedRoute>
              } />
              <Route path="/platform-admin/analytics" element={
                <AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>
              } />
              <Route path="/platform-admin/records" element={
                <AdminProtectedRoute><AdminRecords /></AdminProtectedRoute>
              } />
              {/* Public customer-facing quote view — token is the credential, no auth. */}
              <Route path="/q/:token" element={<PublicQuote />} />
              <Route path="/vendor/query" element={<VendorQuery />} />
              {/* Public off-platform compliance-document upload — 30-day magic-link token, no auth. */}
              <Route path="/compliance-upload" element={<ComplianceUpload />} />
              <Route path="/consent" element={<ConsentConfirmation />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/approval-response" element={<ApprovalResponse />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
