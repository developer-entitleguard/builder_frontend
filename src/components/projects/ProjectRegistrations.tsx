import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Link as LinkIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  Send,
  KeyRound,
} from "lucide-react";
import { format } from "date-fns";
import { LinkRegistrationDialog } from "./LinkRegistrationDialog";
import { HandoverDateDialog } from "./HandoverDateDialog";
import { BulkAttachItemsDialog } from "./BulkAttachItemsDialog";
import { useGetProjectRegistrationsQuery } from "@/store/api/projects";
import {
  useSendEntitlementBulkMutation,
  useBulkAttachItemsMutation,
} from "@/store/api/builderCustomer";
import { useBulkHandoverMutation } from "@/store/api/customerEntitlement";
import { summariseBulk, type BulkOperationRow } from "@/store/api/bulkTypes";

interface Registration {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  property_address: string;
  status: string;
  settlement_date: string | null;
  created_at: string;
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
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [attachOpen, setAttachOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);

  const builderId = getBuilderId();

  const [sendEntitlementBulk, { isLoading: sending }] = useSendEntitlementBulkMutation();
  const [bulkAttachItems, { isLoading: attaching }] = useBulkAttachItemsMutation();
  const [bulkHandover, { isLoading: handing }] = useBulkHandoverMutation();

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
        settlement_date,
        created_at,
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
            Link Existing
          </Button>
          <Button onClick={handleCreateRegistration}>
            <Plus className="h-4 w-4 mr-2" />
            Create Registration
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

  return (
    <div>
      <div className="flex justify-end gap-3 mb-4">
        <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
          <LinkIcon className="h-4 w-4 mr-2" />
          Link Existing
        </Button>
        <Button onClick={handleCreateRegistration}>
          <Plus className="h-4 w-4 mr-2" />
          Create Registration
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-lg border bg-muted/40">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAttachOpen(true)} disabled={attaching}>
              <Package className="h-4 w-4 mr-2" />
              Attach Items
            </Button>
            <Button size="sm" variant="outline" onClick={handleSendEntitlement} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending…" : "Send Entitlement"}
            </Button>
            <Button size="sm" onClick={() => setHandoverOpen(true)} disabled={handing}>
              <KeyRound className="h-4 w-4 mr-2" />
              Handover
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {registrations.map((reg) => {
          const status = statusConfig[reg.status] || statusConfig.draft;
          const checked = selectedIds.has(reg.id);

          return (
            <Card
              key={reg.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/registration/${reg.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSelect(reg.id)}
                      aria-label={`Select ${reg.customer_name}`}
                    />
                  </div>
                  <div className="flex items-start justify-between flex-1 min-w-0">
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground">{reg.customer_name}</h4>
                      <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {reg.customer_email}
                        </span>
                        {reg.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {reg.customer_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {reg.property_address}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge className={status.color}>{status.label}</Badge>
                      {reg.settlement_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(reg.settlement_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
          registrationCount={selectedCount}
          loading={attaching}
          onConfirm={handleAttachItems}
        />
      )}

      <HandoverDateDialog
        open={handoverOpen}
        onOpenChange={setHandoverOpen}
        count={selectedCount}
        loading={handing}
        onConfirm={handleHandover}
      />
    </div>
  );
};
