import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { USER_DATA_EVENT, useOrganization } from "@/hooks/useOrganization";
import { clearSession, revokeSession } from "@/lib/auth/session";
import { builderSessionAdapter } from "@/lib/auth/portalAdapter";
import { PortalSwitcher } from "@/components/PortalSwitcher";
import { openWelcomeGuide } from "@/components/onboarding/welcomeGuide";
import { useEntitlements } from "@/hooks/useEntitlements";
import OrganizationSelector from "@/components/OrganizationSelector";
import { BuilderLogo } from "@/components/BuilderLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Menu, ChevronDown, Bell, HelpCircle, UserCircle, LogOut } from "lucide-react";
import { AnnouncementCenter } from "@/components/announcements/AnnouncementCenter";
import { coverErrorStatus, useGetCoverQueueQuery } from "@/store/api/coverDecisions";
import { recoveryErrorStatus, useGetIncomingNoticesQuery, useGetRecoveryCasesQuery } from "@/store/api/recovery";
import { useGetValueReportQuery, valueReportErrorStatus } from "@/store/api/valueReport";

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
    builderRole,
    currentOrganization,
    hasMultipleOrgs,
  } = useOrganization();
  const { hasModule, ready } = useEntitlements();
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

  const showOrgNavItems = !isVendor;
  // Projects no longer have a single PROJECTS module — the tab shows when the org
  // holds any project-scoped sub-module (Activities / Approvals / Pricing /
  // Compliance docs / Registrations / Documents). Individual tabs inside a project
  // gate on their own module. Registrations + Documents matter for the Project +
  // Compliance (Lite) profile, which has neither Activities nor Compliance docs but
  // still creates and works projects.
  const hasAnyProjectModule =
    hasModule("ACTIVITIES") ||
    hasModule("APPROVALS") ||
    hasModule("PRICING") ||
    hasModule("COMPLIANCE_DOCS") ||
    hasModule("REGISTRATIONS") ||
    hasModule("DOCUMENTS");
  const showProjectsTab = (canManageProjects(effectiveBuilderRole) || effectiveBuilderRole === null) && hasAnyProjectModule;
  // Bulk upload of past projects (CSV import / bulk onboarding) — its own bolt-on,
  // so it can be hidden independently of the project list.
  const showBulkImportTab = (canManageProjects(effectiveBuilderRole) || effectiveBuilderRole === null) && hasModule("PROJECT_IMPORT");
  // Past Homes (Revenue Capabilities Track B): PAST_HOMES bolt-on, Administrator
  // only (the backend's PAST_HOMES_IMPORT permission; Project Managers get no
  // access). Fail-closed while entitlements load so an org without the module
  // never sees it flash in.
  const showPastHomesTab = isAdministrator(effectiveBuilderRole) && ready && hasModule("PAST_HOMES");
  // Completion Gate (Revenue Capabilities Track C): COMPLETION_GATE bolt-on;
  // Administrator, Project Manager and Customer Support (COMPLETION_VIEW).
  // Fail-closed while entitlements load, like Past Homes.
  const showCompletionTab =
    ready &&
    hasModule("COMPLETION_GATE") &&
    (canManageProjects(effectiveBuilderRole) || effectiveBuilderRole === "CUSTOMER_SUPPORT");
  // Verified Referrals (Revenue Capabilities Track D): REFERRALS bolt-on;
  // Administrator (Proof Page, terms, queue) and Customer Support (queue).
  // Fail-closed while entitlements load, like Past Homes.
  const showReferralsTab =
    ready &&
    hasModule("REFERRALS") &&
    (isAdministrator(effectiveBuilderRole) || isCustomerSupport(effectiveBuilderRole));
  // Service Due nominated trades (Revenue Capabilities Track E, SD13):
  // SERVICE_DUE bolt-on, Administrator only (ORG_MANAGE). Fail-closed while
  // entitlements load, like Past Homes.
  const showNominatedTradesTab = ready && hasModule("SERVICE_DUE") && isAdministrator(effectiveBuilderRole);
  // Cover decisions (Revenue Capabilities Track F, CQ9/CQ10): COVERED_OR_QUOTED
  // bolt-on; Administrator and Customer Support (COVER_DECLINE_CONFIRM).
  // Fail-closed while entitlements load, like Past Homes; a 403 from the queue
  // hides the entry (the backend permission is the source of truth).
  const coverDecisionsGate =
    ready &&
    hasModule("COVERED_OR_QUOTED") &&
    (isAdministrator(effectiveBuilderRole) || isCustomerSupport(effectiveBuilderRole));
  const { error: coverQueueError } = useGetCoverQueueQuery(undefined, { skip: !coverDecisionsGate });
  const showCoverDecisionsTab = coverDecisionsGate && coverErrorStatus(coverQueueError) !== 403;
  // Defect Recovery (Revenue Capabilities Track G): DEFECT_RECOVERY bolt-on;
  // Administrator and Customer Support (RECOVERY_RAISE) see Recovery cases;
  // Defects terms and Trade scope are Administrator only (ORG_MANAGE).
  // Fail-closed while entitlements load; a 403 from the list hides the entries.
  const recoveryGate =
    ready &&
    hasModule("DEFECT_RECOVERY") &&
    (isAdministrator(effectiveBuilderRole) || isCustomerSupport(effectiveBuilderRole));
  const { error: recoveryCasesError } = useGetRecoveryCasesQuery(undefined, { skip: !recoveryGate });
  const showRecoveryCases = recoveryGate && recoveryErrorStatus(recoveryCasesError) !== 403;
  const showRecoverySettings = showRecoveryCases && isAdministrator(effectiveBuilderRole);
  // Notices received (DR3, DR9): Administrator (RECOVERY_RESPOND), shown only
  // when another business has sent this builder a notice. No module gate.
  const { data: incomingNotices } = useGetIncomingNoticesQuery(undefined, {
    skip: !isAdministrator(effectiveBuilderRole),
  });
  const showRecoveryNotices = isAdministrator(effectiveBuilderRole) && (incomingNotices?.length ?? 0) > 0;
  const showRecoveryTab = showRecoveryCases || showRecoveryNotices;
  // Value report (Revenue Capabilities F5): Administrator (ORG_MANAGE), no
  // module gate. A 403 hides the entry. Shares the page's default 12-month query.
  const valueReportGate = isAdministrator(effectiveBuilderRole);
  const { error: valueReportError } = useGetValueReportQuery(12, { skip: !valueReportGate });
  const showValueReport = valueReportGate && valueReportErrorStatus(valueReportError) !== 403;
  const showQueriesTab = !isExternalVendor(effectiveBuilderRole) && hasModule("SUPPORT");
  // Sales section (SALES bolt-on) — customers, quotes, invoices, payments.
  const showSalesTab = (canManageProjects(effectiveBuilderRole) || effectiveBuilderRole === null) && hasModule("SALES");
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

  // Who is signed in, for the account menu header (kept fresh by the profile page).
  const accountName = (() => {
    try {
      const raw = localStorage.getItem("userData");
      if (!raw) return null;
      const u = JSON.parse(raw) as { firstName?: string; lastName?: string; email?: string };
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
      return u.email ? { name: name || u.email, email: u.email } : null;
    } catch {
      return null;
    }
  })();

  const handleSignOut = () => {
    if (hasBuilderAuth()) {
      // Revoke server-side first: the refresh token outlives the browser's copy,
      // so forgetting it locally would leave the session usable. Fire-and-forget
      // — the local sign-out must not wait on the network.
      void revokeSession();
      clearSession();
      // Tell OrganizationProvider to reset its in-memory state. Otherwise a
      // re-login in the same tab would race against stale context state.
      window.dispatchEvent(new Event(USER_DATA_EVENT));
      navigate("/auth", { replace: true });
    } else {
      signOut();
    }
  };

  // Unified sign-in — "Sign out of all portals" from the PortalSwitcher. By the
  // time this runs the shared helper has already revoked every refresh session
  // server-side and cleared this window's storage through the adapter, so only
  // the local cleanup that Sign Out does after clearSession() remains.
  const handleSignedOutEverywhere = () => {
    window.dispatchEvent(new Event(USER_DATA_EVENT));
    navigate("/auth", { replace: true });
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
    if (showBulkImportTab) {
      mobileNavItems.push({
        label: "Bulk Onboarding",
        to: "/onboarding/bulk",
        activePrefix: "/onboarding/bulk",
      });
    }
    if (showPastHomesTab) {
      mobileNavItems.push({ label: "Past Homes", to: "/past-homes", activePrefix: "/past-homes" });
    }
    if (showCompletionTab) {
      mobileNavItems.push({ label: "Completion", to: "/completion", activePrefix: "/completion" });
    }
    if (showItemsTab) {
      // Catalog group (PRD_Org_Terms_And_Conditions Phase 4 nav restructure):
      // mobile is a flat list, so the items appear as siblings rather than
      // collapsed under a parent.
      mobileNavItems.push({ label: "Items", to: "/items" });
      mobileNavItems.push({ label: "Terms & Conditions", to: "/terms-versions" });
    }
    if (showQueriesTab || showTicketsTab) {
      mobileNavItems.push({ label: "Support", to: "/support", activePrefix: "/support" });
    }
    if (showCoverDecisionsTab) {
      mobileNavItems.push({ label: "Cover decisions", to: "/cover-decisions", activePrefix: "/cover-decisions" });
    }
    if (showReferralsTab) {
      mobileNavItems.push({ label: "Referrals", to: "/referrals", activePrefix: "/referrals" });
    }
    if (showNominatedTradesTab) {
      mobileNavItems.push({ label: "Nominated trades", to: "/nominated-trades", activePrefix: "/nominated-trades" });
    }
    if (showRecoveryCases) {
      mobileNavItems.push({ label: "Recovery cases", to: "/recovery", activePrefix: "/recovery/cases" });
    }
    if (showRecoveryNotices) {
      mobileNavItems.push({ label: "Notices received", to: "/recovery/notices", activePrefix: "/recovery/notices" });
    }
    if (showRecoverySettings) {
      mobileNavItems.push({ label: "Defects terms", to: "/recovery/terms", activePrefix: "/recovery/terms" });
      mobileNavItems.push({ label: "Trade scope", to: "/recovery/scope", activePrefix: "/recovery/scope" });
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
  if (showValueReport) {
    mobileNavItems.push({ label: "Value report", to: "/value-report", activePrefix: "/value-report" });
  }
  if (canShowAdminTab && showOrgNavItems) {
    mobileNavItems.push({ label: "Admin", to: "/admin" });
  }

  const isActiveNavItem = (item: NavItem) => {
    if (item.activePrefix) return location.pathname.startsWith(item.activePrefix);
    return location.pathname === item.to;
  };

  return (
    <>
    <header className="bg-card border-b border-border shadow-soft">
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

                {currentOrganization && !hasMultipleOrgs && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BuilderLogo skip={!isAuthenticated} />
                    <span className="truncate max-w-[180px]">{currentOrganization.name}</span>
                  </div>
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
                      {(showProjectsTab || showRegistrationsTab || showBulkImportTab || showPastHomesTab || showCompletionTab) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={
                                location.pathname.startsWith("/projects") ||
                                location.pathname.startsWith("/registrations") ||
                                location.pathname.startsWith("/onboarding/bulk") ||
                                location.pathname.startsWith("/past-homes") ||
                                location.pathname.startsWith("/completion")
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
                            {showBulkImportTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/onboarding/bulk" className="cursor-pointer">
                                  Bulk Onboarding
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {showPastHomesTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/past-homes" className="cursor-pointer">
                                  Past Homes
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {showCompletionTab && (
                              <DropdownMenuItem asChild>
                                <Link to="/completion" className="cursor-pointer">
                                  Completion
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
                      {showCoverDecisionsTab && (
                        // Support area with Cover decisions under it (Track F).
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={
                                location.pathname.startsWith("/support") ||
                                location.pathname.startsWith("/queries") ||
                                location.pathname.startsWith("/tickets") ||
                                location.pathname.startsWith("/cover-decisions")
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
                            {(showQueriesTab || showTicketsTab) && (
                              <DropdownMenuItem asChild>
                                <Link to="/support" className="cursor-pointer">
                                  Support board
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link to="/cover-decisions" className="cursor-pointer">
                                Cover decisions
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {!showCoverDecisionsTab && (showQueriesTab || showTicketsTab) && (
                        <Button
                          asChild
                          variant={
                            location.pathname.startsWith("/support") ||
                            location.pathname.startsWith("/queries") ||
                            location.pathname.startsWith("/tickets")
                              ? "default"
                              : "ghost"
                          }
                          size="sm"
                        >
                          <Link to="/support">Support</Link>
                        </Button>
                      )}
                      {showReferralsTab && (
                        <Button
                          asChild
                          variant={location.pathname.startsWith("/referrals") ? "default" : "ghost"}
                          size="sm"
                        >
                          <Link to="/referrals">Referrals</Link>
                        </Button>
                      )}
                      {showNominatedTradesTab && (
                        <Button
                          asChild
                          variant={location.pathname.startsWith("/nominated-trades") ? "default" : "ghost"}
                          size="sm"
                        >
                          <Link to="/nominated-trades">Nominated trades</Link>
                        </Button>
                      )}
                      {showRecoveryTab && (
                        // Defect Recovery (Track G): cases, notices received, terms, scope.
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={location.pathname.startsWith("/recovery") ? "default" : "ghost"}
                              size="sm"
                            >
                              Recovery
                              <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {showRecoveryCases && (
                              <DropdownMenuItem asChild>
                                <Link to="/recovery" className="cursor-pointer">
                                  Recovery cases
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {showRecoveryNotices && (
                              <DropdownMenuItem asChild>
                                <Link to="/recovery/notices" className="cursor-pointer">
                                  Notices received
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {showRecoverySettings && (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link to="/recovery/terms" className="cursor-pointer">
                                    Defects terms
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to="/recovery/scope" className="cursor-pointer">
                                    Trade scope
                                  </Link>
                                </DropdownMenuItem>
                              </>
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
                  {canShowAdminTab && showOrgNavItems && showValueReport && (
                    // Admin area with the Value report under it (Track H, F5).
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={location.pathname === "/admin" || location.pathname === "/value-report" ? "default" : "ghost"}
                          size="sm"
                        >
                          Admin
                          <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer">
                            Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/value-report" className="cursor-pointer">
                            Value report
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {canShowAdminTab && showOrgNavItems && !showValueReport && (
                    <Button
                      variant={location.pathname === '/admin' ? "default" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link to="/admin">Admin</Link>
                    </Button>
                  )}
                  {!(canShowAdminTab && showOrgNavItems) && showValueReport && (
                    <Button
                      variant={location.pathname === "/value-report" ? "default" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link to="/value-report">Value report</Link>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <HelpCircle className="h-4 w-4" />
                        Help
                        <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/help">Help center</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          openWelcomeGuide(currentOrganization?.id);
                          if (location.pathname !== "/dashboard") navigate("/dashboard");
                        }}
                      >
                        Getting started
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="mailto:support@entitleguard.com">Contact support</a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

                {/* Unified sign-in — renders nothing for single-seat users. */}
                {hasBuilderAuth() && (
                  <PortalSwitcher
                    adapter={builderSessionAdapter}
                    onSignedOutEverywhere={handleSignedOutEverywhere}
                  />
                )}

                {/* Account menu: own profile + sign out (narrower than a Sign Out button). */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={location.pathname === "/profile" ? "default" : "ghost"}
                      size="icon"
                      aria-label="Account"
                      title="Account"
                    >
                      <UserCircle className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {accountName && (
                      <DropdownMenuLabel className="font-normal">
                        <div className="truncate text-sm font-medium">{accountName.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{accountName.email}</div>
                      </DropdownMenuLabel>
                    )}
                    {accountName && <DropdownMenuSeparator />}
                    <DropdownMenuItem asChild>
                      <Link to="/profile">
                        <UserCircle className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                    {currentOrganization && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 border-b">
                        <BuilderLogo skip={!isAuthenticated} className="h-7" />
                        <span className="truncate">{currentOrganization.name}</span>
                      </div>
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
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm transition-colors ${
                        location.pathname === "/profile" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      }`}
                    >
                      Profile
                    </Link>
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
    <AnnouncementCenter />
    </>
  );
};
export default Header;
