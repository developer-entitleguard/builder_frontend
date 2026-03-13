import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import OrganizationGate from "@/components/OrganizationGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import ItemsManagement from "./pages/ItemsManagement";
import QueriesManagement from "./pages/QueriesManagement";
import RegistrationDetail from "./pages/RegistrationDetail";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import ConsentConfirmation from "./pages/ConsentConfirmation";
import Projects from "./pages/Projects";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectDetail from "./pages/ProjectDetail";
import ApprovalDetail from "./pages/ApprovalDetail";
import AcceptInvitation from "./pages/AcceptInvitation";
import ApprovalResponse from "./pages/ApprovalResponse";
import PendingQueries from "./pages/PendingQueries";
import AwaitingAction from "./pages/AwaitingAction";
import QueriesComplete from "./pages/QueriesComplete";

const queryClient = new QueryClient();

// Consider user authenticated if Supabase session OR builder login (userData.jwt in localStorage)
const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!(parsed?.jwt);
  } catch {
    return false;
  }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const builderAuth = hasBuilderAuth();

  // If builder JWT is present, allow through immediately (don't wait for Supabase loading)
  if (builderAuth) {
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
              <Route path="/auth/resetPassword" element={<ResetPassword />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
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
              <Route path="/queries" element={
                <ProtectedRoute>
                  <QueriesManagement />
                </ProtectedRoute>
              } />
              <Route path="/pendingQueries" element={
                <ProtectedRoute>
                  <PendingQueries />
                </ProtectedRoute>
              } />
              <Route path="/awaitingAction" element={
                <ProtectedRoute>
                  <AwaitingAction />
                </ProtectedRoute>
              } />
              <Route path="/queriesComplete" element={
                <ProtectedRoute>
                  <QueriesComplete />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/superadmin" element={
                <ProtectedRoute>
                  <SuperAdmin />
                </ProtectedRoute>
              } />
              <Route path="/registration/:id" element={
                <ProtectedRoute>
                  <RegistrationDetail />
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
