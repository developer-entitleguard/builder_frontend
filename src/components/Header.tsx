import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { USER_DATA_EVENT, useOrganization } from "@/hooks/useOrganization";
import { useEntitlements } from "@/hooks/useEntitlements";
import OrganizationSelector from "@/components/OrganizationSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  canAssignVendors,
  canManageProjects,
  isAdministrator,
  isCustomerSupport,
  isExternalVendor,
  isInternalVendor,
  isProjectManager,
  readBuilderRoleFromStorage,
} from "@/lib/roles";
import { useUnreadNotificationCountQuery } from "@/lib/api/services/notifications";
import { Menu, ChevronDown, Bell } from "lucide-react";

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

interface NavItem {
  label: string;
  to: string;
  activePrefix?: string;
}

const Header = () => {
  const { user, signOut } = useAuth();
  const {
    isAdmin,
    isSuperAdmin,
    builderRole,
    currentOrganization,
    hasMultipleOrgs,
    impersonatedOrganization,
    isImpersonating,
    setImpersonatedOrganization,
  } = useOrganization();
  const { hasModule } = useEntitlements();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fall back to localStorage if context hasn't hydrated yet (e.g. on hard refresh
  // before useOrganization re-reads userData).
  const effectiveBuilderRole = builderRole ?? readBuilderRoleFromStorage();
  const isAuthenticated = !!user || hasBuilderAuth();
  // Org-level module gate (Platform Synergy §3.4) layered on top of role gating:
  // a tab shows only when the role permits AND the org has the module enabled.
  // hasModule fails open while entitlements load, so this never flash-hides nav.
  const canShowAdminTab = (isAdmin || isAdministrator(effectiveBuilderRole)) && hasModule("USERS");
  const isVendor = isInternalVendor(effectiveBuilderRole) || isExternalVendor(effectiveBuilderRole);

  const showOrgNavItems = (!isSuperAdmin || isImpersonating) && !isVendor;
  // Projects no longer have a single PROJECTS module — the tab shows when the org
  // holds any project-scoped sub-module (Activities / Approvals / Pricing /
  // Compliance docs). Individual tabs inside a project gate on their own module.
  const hasAnyProjectModule =
    hasModule("ACTIVITIES") ||
    hasModule("APPROVALS") ||
    hasModule("PRICING") ||
    hasModule("COMPLIANCE_DOCS");
  const showProjectsTab = (canManageProjects(effectiveBuilderRole) || isImpersonating || effectiveBuilderRole === null) && hasAnyProjectModule;
  const showQueriesTab = !isExternalVendor(effectiveBuilderRole) && hasModule("SUPPORT");
  // Sales section (SALES bolt-on) — customers, quotes, invoices, payments.
  const showSalesTab = (canManageProjects(effectiveBuilderRole) || isImpersonating || effectiveBuilderRole === null) && hasModule("SALES");
  const showItemsTab = effectiveBuilderRole === null || canManageProjects(effectiveBuilderRole) || effectiveBuilderRole === "CUSTOMER_SUPPORT";
  const showRegistrationsTab =
    (effectiveBuilderRole === null
    || canManageProjects(effectiveBuilderRole)
    || effectiveBuilderRole === "CUSTOMER_SUPPORT")
    && hasModule("REGISTRATIONS");
  const showTicketsTab = canAssignVendors(effectiveBuilderRole);
  const showMyScheduleTab = isInternalVendor(effectiveBuilderRole);
  const showMyAssignmentsTab = isExternalVendor(effectiveBuilderRole);
  // Notifications page (bell) — admin / customer support / project manager.
  const showNotifications =
    isAdministrator(effectiveBuilderRole) ||
    isCustomerSupport(effectiveBuilderRole) ||
    isProjectManager(effectiveBuilderRole);

  // Keep the unread badge live-ish without websockets. Skipped entirely when
  // the bell isn't shown so non-staff never hit the endpoint.
  const { data: unreadData } = useUnreadNotificationCountQuery(undefined, {
    skip: !isAuthenticated || !showNotifications,
    pollingInterval: 60000,
  });
  const unreadCount = unreadData?.data ?? 0;

  const handleStopImpersonation = () => {
    setImpersonatedOrganization(null);
  };

  const handleSignOut = () => {
    if (hasBuilderAuth()) {
      localStorage.removeItem("userData");
      // Tell OrganizationProvider to reset its in-memory state. Otherwise a
      // re-login in the same tab would race against stale context state.
      window.dispatchEvent(new Event(USER_DATA_EVENT));
      navigate("/auth", { replace: true });
    } else {
      signOut();
    }
  };

  // Flat list used for the mobile drawer — respects the same visibility flags.
  const mobileNavItems: NavItem[] = [];
  mobileNavItems.push({ label: "Dashboard", to: "/dashboard" });
  if (showNotifications) {
    mobileNavItems.push({
      label: unreadCount > 0 ? `Notifications (${unreadCount > 99 ? "99+" : unreadCount})` : "Notifications",
      to: "/notifications",
      activePrefix: "/notifications",
    });
  }
  if (showOrgNavItems) {
    if (showProjectsTab) {
      mobileNavItems.push({ label: "Projects", to: "/projects", activePrefix: "/projects" });
    }
    if (showRegistrationsTab) {
      mobileNavItems.push({
        label: "Registrations",
        to: "/registrations",
        activePrefix: "/registrations",
      });
    }
    if (showProjectsTab) {
      mobileNavItems.push({
        label: "Bulk Onboarding",
        to: "/onboarding/bulk",
        activePrefix: "/onboarding/bulk",
      });
    }
    if (showItemsTab) {
      // Catalog group (PRD_Org_Terms_And_Conditions Phase 4 nav restructure):
      // mobile is a flat list, so the items appear as siblings rather than
      // collapsed under a parent.
      mobileNavItems.push({ label: "Items", to: "/items" });
      mobileNavItems.push({ label: "Terms & Conditions", to: "/terms-versions" });
    }
    if (showQueriesTab) {
      mobileNavItems.push({ label: "Queries", to: "/queries", activePrefix: "/queries" });
    }
    if (showTicketsTab) {
      mobileNavItems.push({
        label: "Tickets",
        to: "/tickets",
        activePrefix: "/tickets",
      });
    }
    if (showSalesTab) {
      mobileNavItems.push({ label: "Customers", to: "/customers", activePrefix: "/customers" });
      mobileNavItems.push({ label: "Quotes", to: "/quotes", activePrefix: "/quotes" });
      mobileNavItems.push({ label: "Invoices", to: "/invoices", activePrefix: "/invoices" });
      mobileNavItems.push({ label: "Payments", to: "/payments", activePrefix: "/payments" });
    }
  }
  if (showMyScheduleTab) {
    mobileNavItems.push({ label: "My Schedule", to: "/my-schedule" });
  }
  if (showMyAssignmentsTab) {
    mobileNavItems.push({ label: "My Assignments", to: "/my-assignments" });
  }
  if (canShowAdminTab && showOrgNavItems) {
    mobileNavItems.push({ label: "Admin", to: "/admin" });
  }
  if (isSuperAdmin) {
    mobileNavItems.push({ label: "Super Admin", to: "/superadmin" });
  }

  const isActiveNavItem = (item: NavItem) => {
    if (item.activePrefix) return location.pathname.startsWith(item.activePrefix);
    return location.pathname === item.to;
  };

  return (
    <header className="bg-card border-b border-border shadow-soft">
      {impersonatedOrganization && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1 text-center">
          <span className="text-sm text-primary flex items-center justify-center gap-2">
            Impersonating: <strong>{impersonatedOrganization.name}</strong>
            <button
              onClick={handleStopImpersonation}
              className="underline ml-2 hover:text-primary/80"
            >
              Stop
            </button>
          </span>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              to="/dashboard"
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="p-1 shrink-0">
                <img
                  src="/lovable-uploads/ead1c60a-bfad-4629-8a2b-b9a96ad2a53d.png"
                  alt="EG BuildOS Logo"
                  className="h-10 w-10 rounded-lg"
                />
              </div>
              <h1 className="text-xl font-bold text-foreground truncate">
                EG BuildOS
              </h1>
            </Link>
          </div>

          {isAuthenticated && (
            <>
              {/* ── Desktop nav ── */}
              <div className="hidden md:flex items-center space-x-4">
                {hasMultipleOrgs && <OrganizationSelector />}

                {currentOrganization && !hasMultipleOrgs && !isSuperAdmin && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    {currentOrganization.name}
                  </div>
                )}

                {isSuperAdmin && (
                  <Badge variant="outline" className="text-primary border-primary">
                    Super Admin
                  </Badge>
                )}

                <Button
                  asChild
                  variant={location.pathname === '/dashboard' ? "default" : "secondary"}
                >
                  <Link to="/dashboard">Dashboard</Link>
                </Button>

                <nav className="flex space-x-2">
                  {showOrgNavItems && (
                    <>
                      {(showProjectsTab || showRegistrationsTab) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={
                                location.pathname.startsWith("/projects") ||
                                location.pathname.startsWith("/registrations")
                                  ? "default"
                                  : "ghost"
                              }
                              size="sm"
                            >
                              Builds
                              <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {showProjectsTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/projects" className="cursor-pointer">
                                  Projects
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {showRegistrationsTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/registrations" className="cursor-pointer">
                                  Registrations
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {showProjectsTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/onboarding/bulk" className="cursor-pointer">
                                  Bulk Onboarding
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {showItemsTab && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={
                                location.pathname === '/items' ||
                                location.pathname.startsWith('/terms-versions')
                                  ? "default"
                                  : "ghost"
                              }
                              size="sm"
                            >
                              Catalog
                              <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem asChild>
                              <Link to="/items" className="cursor-pointer">
                                Items
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/terms-versions" className="cursor-pointer">
                                Terms &amp; Conditions
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {(showQueriesTab || showTicketsTab) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={
                                location.pathname.startsWith("/queries") ||
                                location.pathname.startsWith("/tickets")
                                  ? "default"
                                  : "ghost"
                              }
                              size="sm"
                            >
                              Support
                              <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {showQueriesTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/queries" className="cursor-pointer">
                                  Queries
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {showTicketsTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/tickets" className="cursor-pointer">
                                  Tickets
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {showSalesTab && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={
                                location.pathname.startsWith("/customers") ||
                                location.pathname.startsWith("/quotes") ||
                                location.pathname.startsWith("/invoices") ||
                                location.pathname.startsWith("/payments")
                                  ? "default"
                                  : "ghost"
                              }
                              size="sm"
                            >
                              Sales
                              <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem asChild>
                              <Link to="/customers" className="cursor-pointer">
                                Customers
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/quotes" className="cursor-pointer">
                                Quotes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/invoices" className="cursor-pointer">
                                Invoices
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/payments" className="cursor-pointer">
                                Payments
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </>
                  )}
                  {showMyScheduleTab && (
                    <Button
                      variant={location.pathname === '/my-schedule' ? "default" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link to="/my-schedule">My Schedule</Link>
                    </Button>
                  )}
                  {showMyAssignmentsTab && (
                    <Button
                      variant={location.pathname === '/my-assignments' ? "default" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link to="/my-assignments">My Assignments</Link>
                    </Button>
                  )}
                  {canShowAdminTab && showOrgNavItems && (
                    <Button
                      variant={location.pathname === '/admin' ? "default" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link to="/admin">Admin</Link>
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Button
                      variant={location.pathname === '/superadmin' ? "default" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link to="/superadmin">Super Admin</Link>
                    </Button>
                  )}
                </nav>

                {showNotifications && (
                  <Button
                    asChild
                    variant={location.pathname === "/notifications" ? "default" : "ghost"}
                    size="icon"
                    className="relative"
                    aria-label="Notifications"
                  >
                    <Link to="/notifications">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 justify-center text-xs"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>

              {/* ── Mobile nav trigger ── */}
              <div className="md:hidden flex items-center gap-2">
                {hasMultipleOrgs && <OrganizationSelector />}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[88vw] sm:w-[360px] flex flex-col">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    {currentOrganization && !isSuperAdmin && (
                      <div className="text-sm text-muted-foreground py-2 border-b">
                        <span className="truncate">{currentOrganization.name}</span>
                      </div>
                    )}
                    {isSuperAdmin && (
                      <Badge variant="outline" className="self-start text-primary border-primary">
                        Super Admin
                      </Badge>
                    )}
                    <nav className="flex-1 flex flex-col gap-1 py-2 overflow-y-auto">
                      {mobileNavItems.map((item) => {
                        const active = isActiveNavItem(item);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={`rounded-md px-3 py-2 text-sm transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-accent"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileOpen(false);
                        handleSignOut();
                      }}
                    >
                      Sign Out
                    </Button>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;
