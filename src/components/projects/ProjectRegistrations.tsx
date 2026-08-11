import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  Users,
  Plus,
  Link as LinkIcon,
  Package,
  Send,
  KeyRound,
} from "lucide-react";
import { LinkRegistrationDialog } from "./LinkRegistrationDialog";
import { HandoverDateDialog } from "./HandoverDateDialog";
import { BulkAttachItemsDialog } from "./BulkAttachItemsDialog";
import { RegistrationRow } from "./RegistrationRow";
import {
  EditRegistrationDialog,
  type EditRegistrationValues,
  type RegistrationDetailsPatch,
} from "@/components/registrations/EditRegistrationDialog";
import { useGetProjectRegistrationsQuery } from "@/store/api/projects";
import {
  useSendEntitlementBulkMutation,
  useBulkAttachItemsMutation,
  useUpdateCustomerDetailsMutation,
} from "@/store/api/builderCustomer";
import { useBulkHandoverMutation } from "@/store/api/customerEntitlement";
import { useAssignBomToProjectMutation } from "@/store/api";
import { summariseBulk, type BulkOperationRow } from "@/store/api/bulkTypes";

interface Registration {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  property_address: string;
  status: string;
  status_name: string | null;
  settlement_date: string | null;
  created_at: string;
  /** Decoupling: builder that built this unit (null on integrated projects). */
  built_by_name: string | null;
  // Raw editable fields (for the inline per-row edit).
  first_name: string;
  last_name: string;
  unit_number: string;
  total_built_up_area: number | null;
}

interface ProjectRegistrationsProps {
  projectId: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-gray-100 text-gray-700", label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  consented: { color: "bg-green-100 text-green-700", label: "Consented" },
  handed: { color: "bg-emerald-100 text-emerald-700", label: "Handed Over" },
  completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed" },
};

const getBuilderId = (): string | null => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return null;
    const parsed = JSON.parse(userData);
    const orgId =
      parsed?.userInfo?.builderOrganization?.id ??
      parsed?.builderOrganization?.id ??
      parsed?.builder_organization?.id;
    return orgId ?? parsed?.userInfo?.id ?? parsed?.id ?? null;
  } catch {
    return null;
  }
};

export const ProjectRegistrations = ({ projectId }: ProjectRegistrationsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasModule, ready } = useEntitlements();
  // No project-management modules ⇒ no pre-handover "sent" stage; hand over directly.
  // Fail CLOSED: hasModule() is optimistic while entitlements load / on error, which
  // would wrongly expose "Send entitlement" to an org without a PM module — require
  // the entitlement set to be loaded before offering Send.
  const canSendEntitlement = ready && (hasModule("ACTIVITIES") || hasModule("APPROVALS"));
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [attachOpen, setAttachOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [editMode, setEditMode] = useState(false);

  const builderId = getBuilderId();

  const [sendEntitlementBulk, { isLoading: sending }] = useSendEntitlementBulkMutation();
  const [bulkAttachItems, { isLoading: attaching }] = useBulkAttachItemsMutation();
  const [assignBomToProject, { isLoading: assigningBom }] = useAssignBomToProjectMutation();
  const [bulkHandover, { isLoading: handing }] = useBulkHandoverMutation();
  const [updateCustomerDetails, { isLoading: savingEdit }] = useUpdateCustomerDetailsMutation();

  const {
    data: projectRegistrationsResponse,
    isLoading: loading,
    error,
    refetch,
  } = useGetProjectRegistrationsQuery({ projectId }, { skip: !projectId });

  useEffect(() => {
    if (!projectRegistrationsResponse) return;
    const rawRegs = projectRegistrationsResponse.data ?? [];
    const mapped: Registration[] = rawRegs.map((raw) => {
      const r = raw as {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        contact?: string | null;
        unitNumber?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        postcode?: string | null;
        zip?: string | null;
        customer_name?: string;
        customerEmail?: string;
        customer_email?: string;
        statusName?: string | null;
        status?: string | null;
        settlementDate?: string | null;
        settlement_date?: string | null;
        createdAt?: string | null;
        created_at?: string | null;
        totalBuiltUpArea?: number | null;
        builtByBuilderName?: string | null;
      };

      const fullName = [r.firstName, r.lastName].filter(Boolean).join(" ");
      const customer_name =
        fullName ||
        r.customer_name ||
        r.customerEmail ||
        r.customer_email ||
        r.email ||
        "(No name)";

      const customer_email = r.email ?? r.customerEmail ?? r.customer_email ?? "";

      const customer_phone = r.contact ?? null;

      const property_address = [
        r.unitNumber ? `Unit ${r.unitNumber}` : null,
        r.address,
        r.city,
        r.state,
        r.postcode ?? r.zip,
      ]
        .filter(Boolean)
        .join(", ");

      const statusRaw = r.statusName ?? r.status ?? "draft";
      const status = typeof statusRaw === "string" ? statusRaw.toLowerCase() : "draft";

      const settlement_date = r.settlementDate ?? r.settlement_date ?? null;
      const created_at = r.createdAt ?? r.created_at ?? new Date().toISOString();

      return {
        id: r.id,
        customer_name,
        customer_email,
        customer_phone,
        property_address,
        status,
        status_name: r.statusName ?? r.status ?? null,
        settlement_date,
        created_at,
        built_by_name: r.builtByBuilderName ?? null,
        first_name: r.firstName ?? "",
        last_name: r.lastName ?? "",
        unit_number: r.unitNumber ?? "",
        total_built_up_area: r.totalBuiltUpArea ?? null,
      };
    });
    setRegistrations(mapped);
  }, [projectRegistrationsResponse]);

  useEffect(() => {
    if (!error) return;
    const message =
      error && typeof error === "object" && "data" in error
        ? String((error as { data?: unknown }).data ?? "Failed to load registrations")
        : "Failed to load registrations";
    toast({
      title: "Error fetching registrations",
      description: message,
      variant: "destructive",
    });
  }, [error, toast]);

  const fetchRegistrations = () => {
    void refetch();
  };

  const handleCreateRegistration = () => {
    // Navigate to onboarding with project pre-selected
    navigate(`/onboarding?projectId=${projectId}`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === registrations.length
        ? new Set()
        : new Set(registrations.map((r) => r.id))
    );
  };

  // Per-row outcome → single toast. Handed-over / blocked rows come back as
  // failures so the builder sees exactly what was skipped.
  const reportBulk = (title: string, rows: BulkOperationRow[] | undefined) => {
    const { ok, failed, failures } = summariseBulk(rows);
    const detail =
      failed > 0
        ? `${ok} succeeded, ${failed} skipped/blocked` +
          (failures.length
            ? `: ${failures.slice(0, 3).map((f) => f.message).join("; ")}`
            : "")
        : `${ok} succeeded`;
    toast({
      title,
      description: detail,
      variant: failed > 0 && ok === 0 ? "destructive" : "default",
    });
  };

  const afterBulk = () => {
    clearSelection();
    fetchRegistrations();
  };

  const handleSendEntitlement = async () => {
    try {
      const res = await sendEntitlementBulk(Array.from(selectedIds)).unwrap();
      reportBulk("Send entitlement complete", res.data);
      afterBulk();
    } catch (e) {
      toast({
        title: "Error sending entitlements",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleAttachItems = async (itemIds: string[]) => {
    try {
      const res = await bulkAttachItems({
        customerIds: Array.from(selectedIds),
        itemIds,
      }).unwrap();
      reportBulk("Items attached", res.data);
      setAttachOpen(false);
      afterBulk();
    } catch (e) {
      toast({
        title: "Error attaching items",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleAttachBom = async (bomId: string) => {
    if (!bomId) return;
    try {
      const res = await assignBomToProject({
        projectId,
        billOfMaterialId: bomId,
        customerIds: Array.from(selectedIds),
      }).unwrap();
      toast({
        title: res.success ? "BOM attached" : "Couldn't attach BOM",
        description: res.message ?? "",
        variant: res.success ? "default" : "destructive",
      });
      setAttachOpen(false);
      afterBulk();
    } catch (e) {
      toast({
        title: "Error attaching BOM",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async (patch: RegistrationDetailsPatch) => {
    if (!editing) return;
    if (Object.keys(patch).length === 0) {
      setEditing(null);
      return;
    }
    try {
      const res = await updateCustomerDetails({ id: editing.id, patch }).unwrap();
      if (res && res.success === false) {
        toast({
          title: "Couldn't update registration",
          description: res.message || "Update failed.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Registration updated", description: "Your changes have been saved." });
      setEditing(null);
      fetchRegistrations();
    } catch (e) {
      toast({
        title: "Error updating registration",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  // Inline (whole-page) edit autosave. Returns true on success so the row can
  // show its saved indicator. Errors surface as a toast but don't throw.
  const handleInlineUpdate = async (
    rowId: string,
    patch: RegistrationDetailsPatch
  ): Promise<boolean> => {
    try {
      const res = await updateCustomerDetails({ id: rowId, patch }).unwrap();
      if (res && res.success === false) {
        toast({
          title: "Couldn't save",
          description: res.message || "Update failed.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (e) {
      toast({
        title: "Couldn't save",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleEditMode = (on: boolean) => {
    setEditMode(on);
    // Pull fresh values when leaving edit mode so the read view reflects saves.
    if (!on) fetchRegistrations();
  };

  const handleHandover = async (handoverDate: string) => {
    try {
      const res = await bulkHandover({
        customerIds: Array.from(selectedIds),
        handoverDate,
      }).unwrap();
      reportBulk("Handover complete", res.data);
      setHandoverOpen(false);
      afterBulk();
    } catch (e) {
      toast({
        title: "Error during handover",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No registrations linked</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Link existing registrations or create new ones for this project.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Link existing
          </Button>
          <Button onClick={handleCreateRegistration}>
            <Plus className="h-4 w-4 mr-2" />
            Create registration
          </Button>
        </div>

        <LinkRegistrationDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          projectId={projectId}
          onLinked={fetchRegistrations}
        />
      </div>
    );
  }

  const selectedCount = selectedIds.size;
  const allSelected = registrations.length > 0 && selectedCount === registrations.length;
  const handedCount = registrations.filter(
    (r) =>
      r.status === "handed" ||
      r.status === "handed_over" ||
      (r.status_name ?? "").toUpperCase() === "HANDED",
  ).length;

  return (
    <div>
      {selectedCount > 0 ? (
        // Contextual selection bar — replaces the toolbar while rows are selected,
        // so bulk actions never stack as a separate row.
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 rounded-lg border border-primary/40 bg-primary/[0.06] px-4 py-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
            <span className="text-sm font-semibold text-primary">{selectedCount} selected</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAttachOpen(true)} disabled={attaching || assigningBom}>
              <Package className="h-4 w-4 mr-2" />
              Attach items
            </Button>
            {/* Handover is the DEFAULT bulk action — it captures the settlement date. */}
            <Button size="sm" onClick={() => setHandoverOpen(true)} disabled={handing}>
              <KeyRound className="h-4 w-4 mr-2" />
              Handover
            </Button>
            {/* Send-only "share progress" — flips the selected registrations to SENT
                without handing over. Only for orgs with a project-management module. */}
            {canSendEntitlement && (
              <Button size="sm" variant="outline" onClick={handleSendEntitlement} disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sharing…" : "Share Project Progress"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      ) : (
        // Default toolbar: title + count on the left, actions on the right.
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold">Registrations</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {registrations.length} registration{registrations.length === 1 ? "" : "s"}
              {handedCount > 0 ? ` · ${handedCount} handed over` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-lg px-2 py-1"
              title="Edit names, emails and details directly in the list"
            >
              <Switch id="quick-edit" checked={editMode} onCheckedChange={toggleEditMode} />
              <Label htmlFor="quick-edit" className="text-sm text-muted-foreground cursor-pointer">
                Quick edit
              </Label>
            </div>
            <div className="h-5 w-px bg-border" />
            <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Link existing
            </Button>
            <Button onClick={handleCreateRegistration}>
              <Plus className="h-4 w-4 mr-2" />
              Create registration
            </Button>
          </div>
        </div>
      )}

      {/* Lightweight select-all header — only when nothing is selected yet. */}
      {selectedCount === 0 && registrations.length > 0 && (
        <label className="flex items-center gap-2.5 px-1 pb-2 cursor-pointer text-xs font-medium text-muted-foreground">
          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
          Select all
        </label>
      )}

      <div className="space-y-3">
        {registrations.map((reg) => {
          const status = statusConfig[reg.status] || statusConfig.draft;
          const handed =
            reg.status === "handed" ||
            reg.status === "handed_over" ||
            (reg.status_name ?? "").toUpperCase() === "HANDED";

          return (
            <RegistrationRow
              key={reg.id}
              registration={reg}
              editMode={editMode}
              isSelected={selectedIds.has(reg.id)}
              handed={handed}
              statusConfig={status}
              onToggleSelect={toggleSelect}
              onOpen={(rid) => navigate(`/registration/${rid}`)}
              onEdit={(r) => setEditing(r as Registration)}
              onUpdate={handleInlineUpdate}
            />
          );
        })}
      </div>

      <LinkRegistrationDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        projectId={projectId}
        onLinked={fetchRegistrations}
      />

      {builderId && (
        <BulkAttachItemsDialog
          open={attachOpen}
          onOpenChange={setAttachOpen}
          builderId={builderId}
          projectId={projectId}
          registrationCount={selectedCount}
          loading={attaching || assigningBom}
          onConfirm={handleAttachItems}
          onConfirmBom={handleAttachBom}
        />
      )}

      <HandoverDateDialog
        open={handoverOpen}
        onOpenChange={setHandoverOpen}
        count={selectedCount}
        loading={handing}
        onConfirm={handleHandover}
      />

      {editing && (
        <EditRegistrationDialog
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          initial={toEditValues(editing)}
          loading={savingEdit}
          onConfirm={handleSaveEdit}
        />
      )}
    </div>
  );
};

const toEditValues = (reg: Registration): EditRegistrationValues => ({
  firstName: reg.first_name,
  lastName: reg.last_name,
  email: reg.customer_email,
  contact: reg.customer_phone ?? "",
  unitNumber: reg.unit_number,
  totalBuiltUpArea: reg.total_built_up_area != null ? String(reg.total_built_up_area) : "",
});
