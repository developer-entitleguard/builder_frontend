import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  BuildingPart,
  CommercialProjectDetail,
  CommercialRegistration,
  useAddCommercialAssetMutation,
  useCreateCommercialRegistrationMutation,
  useExecuteHandoverMutation,
  useGenerateCommercialActivitiesMutation,
  useGetChecklistDocumentsQuery,
  useGetCommercialDetailQuery,
  useGetBuildingPartsQuery,
  useGetHandoverReadinessQuery,
  useListCommercialBusinessesQuery,
  useListCommercialRegistrationsQuery,
  useMarkChecklistStatusMutation,
  useRegenerateChecklistMutation,
  useReplaceBuildingPartsMutation,
  useUpsertCommercialDetailMutation,
} from "@/store/api/commercial";

/**
 * Commercial Segment PRD 1 (R4-R12). The builder's commercial project workspace:
 * setup capture, building parts, registrations + business tagging, the generated
 * document checklist, and handover. Gated behind commercial segment access.
 */
const CommercialProjectWorkspace = () => {
  const { id: projectId = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { segments, ready } = useEntitlements();

  if (ready && !segments.commercial) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">
          Your organisation does not have commercial segment access.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
        </Button>
        <h1 className="text-2xl font-semibold mb-6">Commercial Project</h1>

        <Tabs defaultValue="setup">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="parts">Building Parts</TabsTrigger>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="handover">Handover</TabsTrigger>
          </TabsList>

          <TabsContent value="setup"><SetupTab projectId={projectId} /></TabsContent>
          <TabsContent value="parts"><PartsTab projectId={projectId} /></TabsContent>
          <TabsContent value="registrations"><RegistrationsTab projectId={projectId} /></TabsContent>
          <TabsContent value="checklist"><ChecklistTab projectId={projectId} toast={toast} /></TabsContent>
          <TabsContent value="handover"><HandoverTab projectId={projectId} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ---- Setup (R5) ----
const FACTOR_FIELDS: { key: keyof CommercialProjectDetail; label: string }[] = [
  { key: "coolingTowers", label: "Cooling towers" },
  { key: "registrablePlant", label: "Lifts / registrable plant" },
  { key: "gasConnected", label: "Gas connected" },
  { key: "foodPremises", label: "Food premises tenancies" },
  { key: "officeAreaOver1000", label: "Office area ≥ 1,000 m²" },
  { key: "heritageListed", label: "Heritage listed" },
];

function SetupTab({ projectId }: { projectId: string }) {
  const { data } = useGetCommercialDetailQuery(projectId);
  const [save, { isLoading }] = useUpsertCommercialDetailMutation();
  const { toast } = useToast();
  const [form, setForm] = useState<CommercialProjectDetail>({});
  const merged = { ...(data ?? {}), ...form };

  const set = (patch: Partial<CommercialProjectDetail>) => setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    try {
      await save({ projectId, body: merged }).unwrap();
      toast({ title: "Saved", description: "Commercial setup updated." });
    } catch {
      toast({ title: "Error", description: "Could not save setup.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Contract & factors</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contract form">
            <Input value={merged.contractForm ?? ""} onChange={(e) => set({ contractForm: e.target.value })} placeholder="AS 4902" />
          </Field>
          <Field label="Practical completion date">
            <Input type="date" value={merged.practicalCompletionDate ?? ""} onChange={(e) => set({ practicalCompletionDate: e.target.value })} />
          </Field>
          <Field label="DLP (months)">
            <Input type="number" value={merged.dlpMonths ?? ""} onChange={(e) => set({ dlpMonths: e.target.value ? Number(e.target.value) : null })} placeholder="12" />
          </Field>
          <Field label="Principal / developer">
            <Input value={merged.principalName ?? ""} onChange={(e) => set({ principalName: e.target.value })} />
          </Field>
          <Field label="Gross floor area (m²)">
            <Input type="number" value={merged.grossFloorArea ?? ""} onChange={(e) => set({ grossFloorArea: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Construction year">
            <Input type="number" value={merged.constructionYear ?? ""} onChange={(e) => set({ constructionYear: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        </div>

        <div>
          <Label className="mb-2 block">Plant & factor flags</Label>
          <div className="grid sm:grid-cols-2 gap-2">
            {FACTOR_FIELDS.map((f) => (
              <label key={String(f.key)} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!merged[f.key]}
                  onCheckedChange={(v) => set({ [f.key]: !!v } as Partial<CommercialProjectDetail>)}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <Button onClick={onSave} disabled={isLoading}>{isLoading ? "Saving…" : "Save setup"}</Button>
      </CardContent>
    </Card>
  );
}

// ---- Building parts (R4) ----
function PartsTab({ projectId }: { projectId: string }) {
  const { data } = useGetBuildingPartsQuery(projectId);
  const [replace, { isLoading }] = useReplaceBuildingPartsMutation();
  const { toast } = useToast();
  const [rows, setRows] = useState<BuildingPart[] | null>(null);
  const parts = rows ?? data ?? [];

  const update = (i: number, patch: Partial<BuildingPart>) =>
    setRows(parts.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const add = () => setRows([...parts, { nccClass: "" }]);
  const remove = (i: number) => setRows(parts.filter((_, idx) => idx !== i));

  const onSave = async () => {
    try {
      const saved = await replace({ projectId, parts }).unwrap();
      setRows(saved);
      toast({ title: "Saved", description: "Building parts updated." });
    } catch {
      toast({ title: "Error", description: "Could not save parts.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Building parts (NCC Part A6)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {parts.length === 0 && <p className="text-sm text-muted-foreground">No parts yet — add one per NCC class.</p>}
        {parts.map((p, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-3">
            <Field label="NCC class"><Input className="w-24" value={p.nccClass} onChange={(e) => update(i, { nccClass: e.target.value })} placeholder="6" /></Field>
            <Field label="Description"><Input value={p.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} /></Field>
            <Field label="Floor area"><Input className="w-28" type="number" value={p.floorArea ?? ""} onChange={(e) => update(i, { floorArea: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Storey"><Input className="w-20" type="number" value={p.storey ?? ""} onChange={(e) => update(i, { storey: e.target.value ? Number(e.target.value) : null })} /></Field>
            {p.ancillaryCollapsed && <Badge variant="secondary">Ancillary → {p.collapsedIntoClass}</Badge>}
            <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add part</Button>
          <Button onClick={onSave} disabled={isLoading}>{isLoading ? "Saving…" : "Save parts"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Registrations (R6/R9) ----
function RegistrationsTab({ projectId }: { projectId: string }) {
  const { data: regs } = useListCommercialRegistrationsQuery(projectId);
  const { data: businesses } = useListCommercialBusinessesQuery();
  const [create, { isLoading }] = useCreateCommercialRegistrationMutation();
  const { toast } = useToast();
  const [draft, setDraft] = useState<CommercialRegistration>({ scope: "TENANCY" });

  const onCreate = async () => {
    try {
      await create({ projectId, body: draft }).unwrap();
      setDraft({ scope: "TENANCY" });
      toast({ title: "Registration added" });
    } catch (e) {
      toast({ title: "Error", description: "Could not create registration.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Registrations (handover units)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(regs ?? []).length === 0 && <p className="text-sm text-muted-foreground">No registrations yet.</p>}
          {(regs ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
              <div>
                <span className="font-medium">{r.scope === "TENANCY" ? r.tenancyIdentifier || "Tenancy" : "Whole building"}</span>
                {r.commercialBusinessId ? (
                  <Badge variant="secondary" className="ml-2">Tagged</Badge>
                ) : (
                  <Badge variant="outline" className="ml-2">Untagged</Badge>
                )}
              </div>
              <span className="text-muted-foreground">{r.status ?? "DRAFT"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add registration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Scope">
              <select className="border rounded-md h-10 px-2 text-sm" value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value as "BUILDING" | "TENANCY" })}>
                <option value="TENANCY">Tenancy</option>
                <option value="BUILDING">Whole building</option>
              </select>
            </Field>
            {draft.scope === "TENANCY" && (
              <Field label="Tenancy identifier"><Input value={draft.tenancyIdentifier ?? ""} onChange={(e) => setDraft({ ...draft, tenancyIdentifier: e.target.value })} placeholder="Shop 1" /></Field>
            )}
            <Field label="Commercial Business">
              <select className="border rounded-md h-10 px-2 text-sm min-w-48" value={draft.commercialBusinessId ?? ""}
                onChange={(e) => setDraft({ ...draft, commercialBusinessId: e.target.value || null })}>
                <option value="">— select (or tag later) —</option>
                {(businesses ?? []).map((b) => <option key={b.id} value={b.id}>{b.legalEntityName}</option>)}
              </select>
            </Field>
          </div>
          <Button onClick={onCreate} disabled={isLoading}>{isLoading ? "Adding…" : "Add registration"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Checklist (R8) ----
function ChecklistTab({ projectId, toast }: { projectId: string; toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: docs } = useGetChecklistDocumentsQuery(projectId);
  const [regenerate, { isLoading }] = useRegenerateChecklistMutation();
  const [markStatus] = useMarkChecklistStatusMutation();
  const [genActivities] = useGenerateCommercialActivitiesMutation();

  const grouped = useMemo(() => {
    const g: Record<string, typeof docs> = { BUILDING: [], TENANCY: [] };
    (docs ?? []).forEach((d) => { (g[d.tier] = g[d.tier] || []).push(d); });
    return g;
  }, [docs]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Document checklist</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await genActivities({ projectId }); toast({ title: "Activity generation started" }); }}>
            Generate activities
          </Button>
          <Button size="sm" onClick={async () => { await regenerate(projectId); }} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-1" /> {isLoading ? "Generating…" : "Regenerate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {(["BUILDING", "TENANCY"] as const).map((tier) => (
          <div key={tier}>
            <h3 className="text-sm font-semibold mb-2">{tier === "BUILDING" ? "Whole building" : "Per tenancy"}</h3>
            {(grouped[tier] ?? []).length === 0 && <p className="text-sm text-muted-foreground">No documents — press Regenerate.</p>}
            {(grouped[tier] ?? []).map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b py-2 text-sm">
                <div>
                  {d.documentName}
                  {d.mandatory === "REQUIRED" && <Badge variant="destructive" className="ml-2">Mandatory</Badge>}
                  {d.egCreatable && <Badge variant="secondary" className="ml-2">EG can issue</Badge>}
                </div>
                <select className="border rounded-md h-8 px-2 text-xs" value={d.status}
                  onChange={(e) => markStatus({ documentId: d.id, status: e.target.value, projectId })}>
                  <option value="REQUIRED">Required</option>
                  <option value="RECEIVED">Received</option>
                  <option value="NOT_APPLICABLE">N/A</option>
                  <option value="OPTIONAL">Optional</option>
                </select>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---- Handover (R11/R12) ----
function HandoverTab({ projectId }: { projectId: string }) {
  const { data: regs } = useListCommercialRegistrationsQuery(projectId);
  return (
    <div className="space-y-3">
      {(regs ?? []).length === 0 && <p className="text-sm text-muted-foreground">Add registrations first.</p>}
      {(regs ?? []).map((r) => <HandoverRow key={r.id} registrationId={r.id!} label={r.scope === "TENANCY" ? r.tenancyIdentifier || "Tenancy" : "Whole building"} />)}
    </div>
  );
}

function HandoverRow({ registrationId, label }: { registrationId: string; label: string }) {
  const { data: readiness } = useGetHandoverReadinessQuery(registrationId);
  const [handover, { isLoading }] = useExecuteHandoverMutation();
  const { toast } = useToast();
  const done = readiness?.lifecycle;

  const onHandover = async () => {
    try {
      await handover({ registrationId, confirmAccuracy: true, sendEmail: true }).unwrap();
      toast({ title: "Handed over", description: "Commercial handover record created." });
    } catch (e) {
      const msg = (e as { data?: { message?: string } })?.data?.message ?? "Handover blocked.";
      toast({ title: "Cannot hand over", description: msg, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">
            {readiness?.businessTagged ? "Business tagged" : "No business"} ·{" "}
            {readiness?.hasPracticalCompletion ? "PC set" : "No PC date"}
            {(readiness?.outstandingMandatory?.length ?? 0) > 0 && ` · ${readiness?.outstandingMandatory?.length} outstanding`}
          </div>
        </div>
        {done ? (
          <Badge>{done}</Badge>
        ) : (
          <Button onClick={onHandover} disabled={isLoading || !readiness?.ready}>
            {isLoading ? "Handing over…" : "Hand over"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ---- shared ----
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default CommercialProjectWorkspace;
