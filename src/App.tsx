import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { store } from "@/store";
import { Suspense, lazy } from "react";

// Lazy load pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ItemsManagement = lazy(() => import("./pages/ItemsManagement"));
const QueriesManagement = lazy(() => import("./pages/QueriesManagement"));
const RegistrationDetail = lazy(() => import("./pages/RegistrationDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const PendingQueries = lazy(() => import("./pages/PendingQueries"));
const AwaitingAction = lazy(() => import("./pages/AwaitingAction"));
const QueriesComplete = lazy(() => import("./pages/QueriesComplete"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute - Auth state:', { user: !!user, loading });
  
  if (loading) {
    console.log('ProtectedRoute - Showing loading');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
  
  console.log('ProtectedRoute - User authenticated, rendering children');
  return <>{children}</>;
};

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

const App = () => (
  <Provider store={store}>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
          <Routes>
                <Route path="/" element={<Auth />} />
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
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
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
            <Route path="/registration/:id" element={
              <ProtectedRoute>
                <RegistrationDetail />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </Provider>
);

export default App;
