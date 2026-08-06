import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, RefreshCw, ChevronDown, ChevronRight, Building2, Upload, UserPlus, Pencil, FileUp, FolderUp, ClipboardCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/useEntitlements";
import { getApiBaseUrl } from "@/lib/config";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";
import { useProjectByIdQuery, useUpdateProjectMutation } from "@/store/api/projects";
import {
  BuildingPart,
  BusinessContact,
  CommercialAsset,
  CommercialAssetDocument,
  CommercialBusiness,
  CommercialComplianceCheck,
  CommercialComplianceDocument,
  CommercialProjectDetail,
  CommercialRegistration,
  useAddChecklistDocumentMutation,
  useAddCommercialAssetMutation,
  useAssignCommercialDocumentMutation,
  useCreateCommercialRegistrationMutation,
  useDeleteChecklistDocumentMutation,
  useDeleteCommercialAssetDocumentMutation,
  useDeleteCommercialAttachmentMutation,
  useExecuteHandoverMutation,
  useGetChecklistDocumentsQuery,
  useGetCommercialDetailQuery,
  useGetBuildingPartsQuery,
  useGetCommercialHandoverReadinessQuery,
  useGetHandoverRecordQuery,
  useImportCommercialAssetsCsvMutation,
  useLazyGetCommercialComplianceCheckQuery,
  useListCommercialAssetsQuery,
  useListCommercialAttachmentsQuery,
  useListCommercialBusinessesQuery,
  useListCommercialRegistrationsQuery,
  useMarkChecklistStatusMutation,
  useRegenerateChecklistMutation,
  useRemoveCommercialAssetMutation,
  useUploadChecklistFolderMutation,
  useUploadCommercialAssetWarrantiesMutation,
  useUploadCommercialAttachmentMutation,
  useReplaceBuildingPartsMutation,
  useTagRegistrationBusinessMutation,
  useUpdateCommercialRegistrationMutation,
  useUpsertCommercialDetailMutation,
} from "@/store/api/commercial";

/**
 * Commercial Segment PRD 1 (R4-R12). The builder's commercial project workspace:
 * setup capture, building parts, registrations + business tagging + assets, the
 * generated document checklist, and handover. Gated behind commercial segment access.
 */
const CommercialProjectWorkspace = () => {
  const { id: projectId = "" } = useParams();
  const navigate = useNavigate();
  const { segments, ready } = useEntitlements();
  const [editOpen, setEditOpen] = useState(false);

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
        {/* The residential project detail page isn't commercial-aware (it now
            redirects commercial projects back here), so exit to the projects list. */}
        <Button variant="ghost" onClick={() => navigate(`/projects`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Commercial Project</h1>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit details
          </Button>
        </div>
        <EditProjectDetailsDialog projectId={projectId} open={editOpen} onOpenChange={setEditOpen} />

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
          <TabsContent value="checklist"><ChecklistTab projectId={projectId} /></TabsContent>
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
  const { data: projectResp } = useProjectByIdQuery({ id: projectId });
  const [save, { isLoading }] = useUpsertCommercialDetailMutation();
  const { toast } = useToast();
  const [form, setForm] = useState<CommercialProjectDetail>({});
  const merged = { ...(data ?? {}), ...form };

  // The project wizard captured a target end date. Practical completion is the
  // legally meaningful date (it starts the DLP clock and gates handover), so
  // seed it from the target end date until the builder confirms the real one.
  const projectEndDate = projectResp?.data?.targetEndDate ?? "";
  const pcDate = merged.practicalCompletionDate ?? projectEndDate ?? "";

  const set = (patch: Partial<CommercialProjectDetail>) => setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    try {
      // Persist the effective PC date even if the seeded value wasn't touched.
      await save({ projectId, body: { ...merged, practicalCompletionDate: pcDate || null } }).unwrap();
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
            <Input type="date" value={pcDate} onChange={(e) => set({ practicalCompletionDate: e.target.value })} />
            <p className="text-xs text-muted-foreground">Starts the Defects Liability Period and gates handover. Seeded from the project's target end date.</p>
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
          <p className="text-xs text-muted-foreground mb-2">
            These drive which compliance documents the checklist selects — e.g. cooling towers add a
            water-treatment/RMP requirement, lifts add registrable-plant items.
          </p>
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
const NCC_CLASS_OPTIONS: { value: string; label: string }[] = [
  { value: "2", label: "Class 2 — Apartments / sole-occupancy units" },
  { value: "3", label: "Class 3 — Accommodation (hotel, motel, hostel)" },
  { value: "5", label: "Class 5 — Office" },
  { value: "6", label: "Class 6 — Retail / shop / café" },
  { value: "7a", label: "Class 7a — Carpark" },
  { value: "7b", label: "Class 7b — Warehouse / storage" },
  { value: "8", label: "Class 8 — Laboratory / factory / production" },
  { value: "9a", label: "Class 9a — Health-care building" },
  { value: "9b", label: "Class 9b — Assembly building" },
  { value: "9c", label: "Class 9c — Residential aged care" },
  { value: "10a", label: "Class 10a — Non-habitable (shed, carport)" },
  { value: "10b", label: "Class 10b — Structure (fence, pool, mast)" },
];

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
        <p className="text-sm text-muted-foreground">
          Under NCC Part A6 a single building is classified by its parts. List each distinct
          use — e.g. a mixed-use building might have <span className="font-medium">Class 5</span> offices,
          {" "}<span className="font-medium">Class 6</span> retail at ground, and a <span className="font-medium">Class 7a</span> carpark.
          These classes (with the factor flags on Setup) determine which compliance documents apply.
          A small part wholly ancillary to a larger one is collapsed into it automatically.
        </p>
        {parts.length === 0 && <p className="text-sm text-muted-foreground">No parts yet — add one per NCC class present in the building.</p>}
        {parts.map((p, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-3">
            <Field label="NCC class">
              <select
                className="border rounded-md h-10 px-2 text-sm min-w-64"
                value={p.nccClass}
                onChange={(e) => update(i, { nccClass: e.target.value })}
              >
                <option value="">— select a class —</option>
                {NCC_CLASS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Description"><Input value={p.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} placeholder="e.g. Ground-floor retail" /></Field>
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

// ---- Business selection (R9) ----
const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: "COMPANY", label: "Company (Pty Ltd)" },
  { value: "SOLE_TRADER", label: "Sole trader" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "TRUST", label: "Trust" },
  { value: "INCORPORATED_ASSOCIATION", label: "Incorporated association" },
  { value: "GOVERNMENT", label: "Government" },
];

type BusinessSelection = { commercialBusinessId?: string | null; newBusiness?: CommercialBusiness | null };

const NEW_TAG = "__new__";

/** Normalises the inline new-business form into a create payload. */
function cleanNewBusiness(nb: CommercialBusiness): CommercialBusiness {
  const c = nb.contacts?.[0];
  const hasContact = !!(c && (c.name || c.email || c.phone));
  const contacts: BusinessContact[] = hasContact
    ? [{ role: "PRIMARY", name: c!.name || nb.legalEntityName, email: c!.email || null, phone: c!.phone || null }]
    : [];
  return {
    legalEntityName: nb.legalEntityName.trim(),
    abn: (nb.abn ?? "").trim(),
    acn: nb.acn?.trim() || null,
    entityType: nb.entityType || "COMPANY",
    contacts,
  };
}

/** Select an existing commercial business or capture a new one inline (create-or-select). */
function BusinessForm({
  businesses,
  value,
  onChange,
}: {
  businesses: CommercialBusiness[];
  value: BusinessSelection;
  onChange: (v: BusinessSelection) => void;
}) {
  const isNew = value.newBusiness != null;
  const selectVal = isNew ? NEW_TAG : value.commercialBusinessId ?? "";
  const nb: CommercialBusiness =
    value.newBusiness ?? { legalEntityName: "", abn: "", entityType: "COMPANY" };

  const setNb = (patch: Partial<CommercialBusiness>) => onChange({ newBusiness: { ...nb, ...patch } });
  const setContact = (field: "name" | "email" | "phone", val: string) => {
    const c0 = nb.contacts?.[0] ?? { role: "PRIMARY", name: "" };
    onChange({ newBusiness: { ...nb, contacts: [{ ...c0, role: "PRIMARY", [field]: val }] } });
  };

  return (
    <div className="space-y-2">
      <select
        className="border rounded-md h-10 px-2 text-sm min-w-56 w-full max-w-sm"
        value={selectVal}
        onChange={(e) => {
          const v = e.target.value;
          if (v === NEW_TAG) onChange({ newBusiness: { legalEntityName: "", abn: "", entityType: "COMPANY" } });
          else onChange({ commercialBusinessId: v || null });
        }}
      >
        <option value="">— Untagged (tag later) —</option>
        {businesses.map((b) => <option key={b.id} value={b.id}>{b.legalEntityName}</option>)}
        <option value={NEW_TAG}>＋ Add a new business…</option>
      </select>

      {isNew && (
        <div className="rounded-md border bg-muted/30 p-3 grid sm:grid-cols-2 gap-2">
          <Field label="Legal entity name *"><Input value={nb.legalEntityName} onChange={(e) => setNb({ legalEntityName: e.target.value })} placeholder="Acme Retail Pty Ltd" /></Field>
          <Field label="ABN *"><Input value={nb.abn ?? ""} onChange={(e) => setNb({ abn: e.target.value })} placeholder="11-digit ABN" /></Field>
          <Field label="Entity type *">
            <select className="border rounded-md h-10 px-2 text-sm w-full" value={nb.entityType} onChange={(e) => setNb({ entityType: e.target.value })}>
              {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="ACN"><Input value={nb.acn ?? ""} onChange={(e) => setNb({ acn: e.target.value || null })} placeholder="optional" /></Field>
          <Field label="Contact name"><Input value={nb.contacts?.[0]?.name ?? ""} onChange={(e) => setContact("name", e.target.value)} placeholder="Primary contact" /></Field>
          <Field label="Contact email"><Input type="email" value={nb.contacts?.[0]?.email ?? ""} onChange={(e) => setContact("email", e.target.value)} /></Field>
          <Field label="Contact phone"><Input value={nb.contacts?.[0]?.phone ?? ""} onChange={(e) => setContact("phone", e.target.value)} /></Field>
        </div>
      )}
    </div>
  );
}

/** Turns a selection into the body the create/tag endpoints expect. */
function selectionToBody(sel: BusinessSelection): CommercialRegistration {
  if (sel.newBusiness) return { newBusiness: cleanNewBusiness(sel.newBusiness), allowDuplicateBusiness: false } as CommercialRegistration;
  return { commercialBusinessId: sel.commercialBusinessId ?? null } as CommercialRegistration;
}

function errMessage(e: unknown, fallback: string): string {
  return (e as { data?: { message?: string } })?.data?.message ?? fallback;
}

// ---- Registrations (R6/R9/R10) ----
function RegistrationsTab({ projectId }: { projectId: string }) {
  const { data: regs } = useListCommercialRegistrationsQuery(projectId);
  const { data: businesses } = useListCommercialBusinessesQuery();
  const [create, { isLoading }] = useCreateCommercialRegistrationMutation();
  const { toast } = useToast();
  const [scope, setScope] = useState<"BUILDING" | "TENANCY">("TENANCY");
  const [tenancyIdentifier, setTenancyIdentifier] = useState("");
  const [sel, setSel] = useState<BusinessSelection>({ commercialBusinessId: null });

  const onCreate = async () => {
    try {
      const body: CommercialRegistration = {
        scope,
        tenancyIdentifier: scope === "TENANCY" ? tenancyIdentifier || null : null,
        ...selectionToBody(sel),
      };
      await create({ projectId, body }).unwrap();
      setScope("TENANCY");
      setTenancyIdentifier("");
      setSel({ commercialBusinessId: null });
      toast({ title: "Registration added" });
    } catch (e) {
      toast({ title: "Error", description: errMessage(e, "Could not create registration."), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Registrations (handover units)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(regs ?? []).length === 0 && <p className="text-sm text-muted-foreground">No registrations yet.</p>}
          {(regs ?? []).map((r) => (
            <RegistrationEditor key={r.id} reg={r} businesses={businesses ?? []} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add registration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start gap-4">
            <Field label="Scope">
              <select className="border rounded-md h-10 px-2 text-sm" value={scope}
                onChange={(e) => setScope(e.target.value as "BUILDING" | "TENANCY")}>
                <option value="TENANCY">Tenancy</option>
                <option value="BUILDING">Whole building</option>
              </select>
            </Field>
            {scope === "TENANCY" && (
              <Field label="Tenancy identifier"><Input value={tenancyIdentifier} onChange={(e) => setTenancyIdentifier(e.target.value)} placeholder="Shop 1" /></Field>
            )}
            <Field label="Owning / occupying business">
              <BusinessForm businesses={businesses ?? []} value={sel} onChange={setSel} />
            </Field>
          </div>
          <Button onClick={onCreate} disabled={isLoading}>{isLoading ? "Adding…" : "Add registration"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** A single registration row that expands into an editor: tenancy fields, business tagging, assets. */
function RegistrationEditor({ reg, businesses }: { reg: CommercialRegistration; businesses: CommercialBusiness[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [update, { isLoading: saving }] = useUpdateCommercialRegistrationMutation();
  const [tag, { isLoading: tagging }] = useTagRegistrationBusinessMutation();

  const [tenancyIdentifier, setTenancyIdentifier] = useState(reg.tenancyIdentifier ?? "");
  const [level, setLevel] = useState(reg.level ?? "");
  const [area, setArea] = useState<string>(reg.area != null ? String(reg.area) : "");
  const [sel, setSel] = useState<BusinessSelection>({ commercialBusinessId: reg.commercialBusinessId ?? null });

  const label = reg.scope === "TENANCY" ? reg.tenancyIdentifier || "Tenancy" : "Whole building";
  const taggedName = businesses.find((b) => b.id === reg.commercialBusinessId)?.legalEntityName;

  const saveFields = async () => {
    try {
      await update({
        id: reg.id!,
        body: {
          scope: reg.scope,
          tenancyIdentifier: reg.scope === "TENANCY" ? tenancyIdentifier || null : null,
          level: level || null,
          area: area ? Number(area) : null,
        } as CommercialRegistration,
      }).unwrap();
      toast({ title: "Saved", description: "Registration updated." });
    } catch (e) {
      toast({ title: "Error", description: errMessage(e, "Could not save."), variant: "destructive" });
    }
  };

  const saveBusiness = async () => {
    try {
      await tag({ id: reg.id!, body: selectionToBody(sel) }).unwrap();
      toast({ title: "Business updated" });
    } catch (e) {
      toast({ title: "Could not tag business", description: errMessage(e, "Check the ABN and try again."), variant: "destructive" });
    }
  };

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-3 text-sm text-left"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{label}</span>
          {reg.commercialBusinessId ? (
            <Badge variant="secondary">{taggedName ? `Tagged · ${taggedName}` : "Tagged"}</Badge>
          ) : (
            <Badge variant="outline">Untagged</Badge>
          )}
        </span>
        <span className="text-muted-foreground">{reg.status ?? "DRAFT"}</span>
      </button>

      {open && (
        <div className="border-t p-3 space-y-4">
          {/* Tenancy details */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Details</Label>
            <div className="flex flex-wrap items-end gap-2">
              {reg.scope === "TENANCY" && (
                <Field label="Tenancy identifier"><Input value={tenancyIdentifier} onChange={(e) => setTenancyIdentifier(e.target.value)} placeholder="Shop 1" /></Field>
              )}
              <Field label="Level"><Input className="w-24" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="G" /></Field>
              <Field label="Area (m²)"><Input className="w-28" type="number" value={area} onChange={(e) => setArea(e.target.value)} /></Field>
              <Button size="sm" onClick={saveFields} disabled={saving}>{saving ? "Saving…" : "Save details"}</Button>
            </div>
          </div>

          {/* Business tagging */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Owning / occupying business</Label>
            <BusinessForm businesses={businesses} value={sel} onChange={setSel} />
            <Button size="sm" onClick={saveBusiness} disabled={tagging}>{tagging ? "Saving…" : "Save business"}</Button>
          </div>

          {/* Assets */}
          <AssetsSection registrationId={reg.id!} />
        </div>
      )}
    </div>
  );
}

// ---- shared folder picker (webkitdirectory) ----
type PickedFile = File & { webkitRelativePath?: string };

/** A button that opens a folder picker and returns the chosen files + their relative paths. */
function FolderButton({
  label,
  extensions,
  onPick,
  disabled,
}: {
  label: string;
  extensions?: string[];
  onPick: (files: File[], relativePaths: string[]) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute("webkitdirectory", "");
      ref.current.setAttribute("directory", "");
    }
  }, []);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const all = Array.from(e.target.files ?? []) as PickedFile[];
    if (ref.current) ref.current.value = "";
    const files = extensions
      ? all.filter((f) => extensions.some((ext) => f.name.toLowerCase().endsWith("." + ext)))
      : all;
    if (files.length) onPick(files, files.map((f) => f.webkitRelativePath || f.name));
  };
  return (
    <>
      <input ref={ref} type="file" multiple className="hidden" onChange={onChange} />
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={disabled}>
        <FolderUp className="h-4 w-4 mr-1" /> {label}
      </Button>
    </>
  );
}

const DOC_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "heic"];
const ASSET_DOC_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "heic", "doc", "docx"];

const ASSET_DOC_CATEGORY_LABEL: Record<string, string> = {
  WARRANTY: "Warranty",
  MANUAL: "Manual",
  OTHER: "Other",
};

// ---- Assets (R10) ----
function AssetsSection({ registrationId }: { registrationId: string }) {
  const { data: assets } = useListCommercialAssetsQuery(registrationId);
  const [add, { isLoading }] = useAddCommercialAssetMutation();
  const [remove] = useRemoveCommercialAssetMutation();
  const [importCsv, { isLoading: importing }] = useImportCommercialAssetsCsvMutation();
  const [uploadWarranties, { isLoading: uploadingWarranties }] = useUploadCommercialAssetWarrantiesMutation();
  const { toast } = useToast();
  const [draft, setDraft] = useState<CommercialAsset>({ name: "" });
  const csvRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<CommercialAsset>) => setDraft((d) => ({ ...d, ...patch }));

  const onAdd = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Asset name is required", variant: "destructive" });
      return;
    }
    try {
      await add({ registrationId, body: draft }).unwrap();
      setDraft({ name: "" });
      toast({ title: "Asset added" });
    } catch (e) {
      toast({ title: "Error", description: errMessage(e, "Could not add asset."), variant: "destructive" });
    }
  };

  const onCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (csvRef.current) csvRef.current.value = "";
    if (!file) return;
    try {
      const res = await importCsv({ registrationId, file }).unwrap();
      toast({ title: `Imported ${res.created} asset(s)`, description: res.skipped?.length ? `${res.skipped.length} row(s) skipped.` : undefined });
    } catch (err) {
      toast({ title: "CSV import failed", description: errMessage(err, "Check the file has a Name column."), variant: "destructive" });
    }
  };

  const onWarranties = async (files: File[], relativePaths: string[]) => {
    try {
      const res = await uploadWarranties({ registrationId, files, relativePaths }).unwrap();
      toast({ title: `Attached ${res.created?.length ?? 0} document(s)`, description: res.skipped?.length ? `${res.skipped.length} file(s) skipped.` : undefined });
    } catch (err) {
      toast({ title: "Upload failed", description: errMessage(err, "Could not attach the warranties."), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assets & plant</Label>
        <div className="flex items-center gap-1.5">
          <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onCsv} />
          <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} disabled={importing}>
            <FileUp className="h-4 w-4 mr-1" /> {importing ? "Importing…" : "Import BOM (CSV)"}
          </Button>
          <FolderButton label={uploadingWarranties ? "Uploading…" : "Upload warranties"} extensions={ASSET_DOC_EXTENSIONS} onPick={onWarranties} disabled={uploadingWarranties} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        CSV columns: Name, Make, Model, Serial, Location, Commissioning date, Warranty months, Registrable plant.
        Folder documents are matched to assets by name and filed as Warranty or Manual.
      </p>
      {(assets ?? []).length === 0 && <p className="text-xs text-muted-foreground">No assets yet.</p>}
      {(assets ?? []).map((a) => (
        <div key={a.id} className="border rounded-md px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span>
              <span className="font-medium">{a.name}</span>
              {a.serialNumber && <span className="text-muted-foreground"> · {a.serialNumber}</span>}
              {a.registrablePlant && <Badge variant="secondary" className="ml-2">Registrable plant</Badge>}
              {a.warrantyExpiry && <span className="text-muted-foreground"> · warranty to {a.warrantyExpiry}</span>}
            </span>
            <Button variant="ghost" size="icon" onClick={() => remove({ registrationId, assetId: a.id! })}><Trash2 className="h-4 w-4" /></Button>
          </div>
          {(a.documents ?? []).length > 0 && (
            <div className="mt-1.5 ml-1 flex flex-wrap gap-1.5">
              {(a.documents ?? []).map((doc) => (
                <AssetDocChip key={doc.id} doc={doc} registrationId={registrationId} assetId={a.id!} />
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="rounded-md border bg-muted/30 p-3 grid sm:grid-cols-3 gap-2 items-end">
        <Field label="Name *"><Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Chiller unit" /></Field>
        <Field label="Make"><Input value={draft.make ?? ""} onChange={(e) => set({ make: e.target.value || null })} /></Field>
        <Field label="Model"><Input value={draft.model ?? ""} onChange={(e) => set({ model: e.target.value || null })} /></Field>
        <Field label="Serial number"><Input value={draft.serialNumber ?? ""} onChange={(e) => set({ serialNumber: e.target.value || null })} /></Field>
        <Field label="Location"><Input value={draft.location ?? ""} onChange={(e) => set({ location: e.target.value || null })} placeholder="Roof plant room" /></Field>
        <Field label="Commissioning date"><Input type="date" value={draft.commissioningDate ?? ""} onChange={(e) => set({ commissioningDate: e.target.value || null })} /></Field>
        <Field label="Warranty (months)"><Input type="number" value={draft.warrantyTermMonths ?? ""} onChange={(e) => set({ warrantyTermMonths: e.target.value ? Number(e.target.value) : null })} /></Field>
        <label className="flex items-center gap-2 text-sm pb-2">
          <Checkbox checked={!!draft.registrablePlant} onCheckedChange={(v) => set({ registrablePlant: !!v })} />
          Registrable plant
        </label>
        <Button size="sm" onClick={onAdd} disabled={isLoading}><Plus className="h-4 w-4 mr-1" /> {isLoading ? "Adding…" : "Add asset"}</Button>
      </div>
    </div>
  );
}

/** A single asset document (warranty / manual / other) chip with download + delete. */
function AssetDocChip({ doc, registrationId, assetId }: { doc: CommercialAssetDocument; registrationId: string; assetId: string }) {
  const [remove] = useDeleteCommercialAssetDocumentMutation();
  const isWarranty = doc.category === "WARRANTY";
  const chipClass = isWarranty
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : doc.category === "MANUAL"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${chipClass}`}>
      <span className="font-medium">{ASSET_DOC_CATEGORY_LABEL[doc.category] ?? "Other"}</span>
      <a href={fileHref(doc.fileId)} target="_blank" rel="noreferrer" className="max-w-[10rem] truncate underline">
        {doc.fileName || doc.documentName || "file"}
      </a>
      <button type="button" className="opacity-60 hover:opacity-100" onClick={() => remove({ registrationId, assetId, documentId: doc.id })}>
        <Trash2 className="h-3 w-3" />
      </button>
    </span>
  );
}

// ---- Checklist (R8) — generate, deliver (attach), assign ----
const fileHref = (fileId?: string | null): string | undefined =>
  fileId ? `${getApiBaseUrl()}/unsecure/download/${fileId}` : undefined;

function ChecklistTab({ projectId }: { projectId: string }) {
  const { data: docs } = useGetChecklistDocumentsQuery(projectId);
  const { data: regs } = useListCommercialRegistrationsQuery(projectId);
  const [regenerate, { isLoading }] = useRegenerateChecklistMutation();
  const [uploadFolder, { isLoading: uploadingFolder }] = useUploadChecklistFolderMutation();
  const [runCheck, { data: checkResult, isFetching: checking }] = useLazyGetCommercialComplianceCheckQuery();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<string, typeof docs> = { BUILDING: [], TENANCY: [] };
    (docs ?? []).forEach((d) => { (g[d.tier] = g[d.tier] || []).push(d); });
    return g;
  }, [docs]);

  const onFolder = async (files: File[], relativePaths: string[]) => {
    try {
      const res = await uploadFolder({ projectId, files, relativePaths }).unwrap();
      const data = res?.data as { matched?: unknown[]; unmatched?: string[] } | undefined;
      toast({ title: res?.message || "Folder processed", description: data?.unmatched?.length ? `${data.unmatched.length} file(s) didn't match a row.` : undefined });
    } catch (err) {
      toast({ title: "Upload failed", description: errMessage(err, "Could not process the folder."), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Document checklist</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            The compliance documents this building must hand over. Regenerate rebuilds it from the
            building's classes and factors. Attach each delivered document, or assign it to a trade to produce.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button variant="outline" size="sm" onClick={() => runCheck(projectId)} disabled={checking}>
            <ClipboardCheck className="h-4 w-4 mr-1" /> {checking ? "Checking…" : "Run compliance check"}
          </Button>
          <FolderButton label={uploadingFolder ? "Uploading…" : "Upload folder"} extensions={DOC_EXTENSIONS} onPick={onFolder} disabled={uploadingFolder} />
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add document
          </Button>
          <Button size="sm" onClick={() => regenerate(projectId)} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-1" /> {isLoading ? "Generating…" : "Regenerate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {checkResult && <ComplianceCheckCard result={checkResult} />}
        {(["BUILDING", "TENANCY"] as const).map((tier) => (
          <div key={tier}>
            <h3 className="text-sm font-semibold mb-2">{tier === "BUILDING" ? "Whole building" : "Per tenancy"}</h3>
            {(grouped[tier] ?? []).length === 0 && <p className="text-sm text-muted-foreground">No documents — press Regenerate.</p>}
            {(grouped[tier] ?? []).map((d) => <DocRow key={d.id} doc={d} projectId={projectId} />)}
          </div>
        ))}
      </CardContent>
      <AddChecklistDocumentDialog projectId={projectId} regs={regs ?? []} open={addOpen} onOpenChange={setAddOpen} />
    </Card>
  );
}

/** Advisory result of the assessment-only compliance check (generates nothing). */
function ComplianceCheckCard({ result }: { result: CommercialComplianceCheck }) {
  const ok = result.readyForHandover;
  return (
    <div className={`rounded-md border p-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-center gap-2 font-medium">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
        {ok
          ? "All mandatory documents appear to be present"
          : `${result.missing.length} mandatory document(s) still needed`}
      </div>
      {!ok && result.missing.length > 0 && (
        <ul className="mt-1.5 ml-6 list-disc text-muted-foreground">
          {result.missing.map((m, i) => <li key={i}>{m.documentName}</li>)}
        </ul>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        Assessment only — this does not generate or change any documents. {result.uploadedCount} received.
      </p>
    </div>
  );
}

/** Dialog to add an ad-hoc (MANUAL) checklist row the rulebook didn't generate. */
function AddChecklistDocumentDialog({ projectId, regs, open, onOpenChange }: { projectId: string; regs: CommercialRegistration[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [add, { isLoading }] = useAddChecklistDocumentMutation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [tier, setTier] = useState<"BUILDING" | "TENANCY">("BUILDING");
  const [mandatory, setMandatory] = useState<"REQUIRED" | "OPTIONAL">("OPTIONAL");
  const [registrationId, setRegistrationId] = useState<string>("");
  const tenancies = regs.filter((r) => r.scope === "TENANCY");

  const onSave = async () => {
    if (!name.trim()) {
      toast({ title: "Document name is required", variant: "destructive" });
      return;
    }
    if (tier === "TENANCY" && !registrationId) {
      toast({ title: "Pick a tenancy for a tenancy document", variant: "destructive" });
      return;
    }
    try {
      await add({ projectId, body: { documentName: name.trim(), tier, mandatory, commercialRegistrationId: tier === "TENANCY" ? registrationId : null } }).unwrap();
      toast({ title: "Document added" });
      setName(""); setTier("BUILDING"); setMandatory("OPTIONAL"); setRegistrationId("");
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not add document", description: errMessage(err, "Please try again."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a document</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Document name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fire safety statement" /></Field>
          <Field label="Scope">
            <select className="border rounded-md h-10 px-2 text-sm w-full" value={tier} onChange={(e) => setTier(e.target.value as "BUILDING" | "TENANCY")}>
              <option value="BUILDING">Whole building</option>
              <option value="TENANCY">Per tenancy</option>
            </select>
          </Field>
          {tier === "TENANCY" && (
            <Field label="Tenancy">
              <select className="border rounded-md h-10 px-2 text-sm w-full" value={registrationId} onChange={(e) => setRegistrationId(e.target.value)}>
                <option value="">— Select tenancy —</option>
                {tenancies.map((r) => <option key={r.id} value={r.id!}>{r.tenancyIdentifier || "Tenancy"}</option>)}
              </select>
            </Field>
          )}
          <Field label="Requirement">
            <select className="border rounded-md h-10 px-2 text-sm w-full" value={mandatory} onChange={(e) => setMandatory(e.target.value as "REQUIRED" | "OPTIONAL")}>
              <option value="OPTIONAL">Optional</option>
              <option value="REQUIRED">Mandatory (gates handover)</option>
            </select>
          </Field>
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={isLoading}>{isLoading ? "Adding…" : "Add document"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One checklist row: status, delivered-document attachments, and assign-to-trade. */
function DocRow({ doc, projectId }: { doc: CommercialComplianceDocument; projectId: string }) {
  const { data: attachments } = useListCommercialAttachmentsQuery(doc.id);
  const [markStatus] = useMarkChecklistStatusMutation();
  const [upload, { isLoading: uploading }] = useUploadCommercialAttachmentMutation();
  const [removeAttachment] = useDeleteCommercialAttachmentMutation();
  const [assign, { isLoading: assigning }] = useAssignCommercialDocumentMutation();
  const [deleteRow] = useDeleteChecklistDocumentMutation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignName, setAssignName] = useState("");
  const [assignEmail, setAssignEmail] = useState("");

  const received = doc.status === "RECEIVED";

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    try {
      await upload({ documentId: doc.id, projectId, file }).unwrap();
      toast({ title: "Document attached" });
    } catch (err) {
      toast({ title: "Upload failed", description: errMessage(err, "Could not attach the document."), variant: "destructive" });
    }
  };

  const onAssign = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignEmail.trim())) {
      toast({ title: "Enter a valid trade email", variant: "destructive" });
      return;
    }
    try {
      const res = await assign({ documentId: doc.id, projectId, body: { assigneeName: assignName.trim() || null, assigneeEmail: assignEmail.trim() } }).unwrap();
      // The backend returns HTTP 200 with success:false for soft failures (e.g. already received).
      if (res && res.success === false) {
        toast({ title: "Could not assign", description: res.message || "Please try again.", variant: "destructive" });
        return;
      }
      toast({ title: "Assigned to trade", description: "They'll get a link to upload the document." });
      setShowAssign(false); setAssignName(""); setAssignEmail("");
    } catch (err) {
      toast({ title: "Could not assign", description: errMessage(err, "Please try again."), variant: "destructive" });
    }
  };

  const atts = attachments ?? [];

  return (
    <div className={`border-b py-2 text-sm ${received ? "bg-emerald-50/60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {doc.documentName}
          {received && <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Received</Badge>}
          {doc.mandatory === "REQUIRED" && !received && <Badge variant="destructive" className="ml-2">Mandatory</Badge>}
          {doc.assigneeLabel && !received && <Badge variant="secondary" className="ml-2">Assigned · {doc.assigneeLabel}</Badge>}
          {atts.length > 0 && <Badge variant="outline" className="ml-2">{atts.length} file{atts.length > 1 ? "s" : ""}</Badge>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" /> {uploading ? "…" : "Attach"}
          </Button>
          {!received && (
            <Button variant="ghost" size="sm" onClick={() => setShowAssign((s) => !s)}>
              <UserPlus className="h-4 w-4 mr-1" /> Assign
            </Button>
          )}
          <select className="border rounded-md h-8 px-2 text-xs" value={doc.status}
            onChange={(e) => markStatus({ documentId: doc.id, status: e.target.value, projectId })}>
            <option value="REQUIRED">Required</option>
            <option value="RECEIVED">Received</option>
            <option value="NOT_APPLICABLE">N/A</option>
            <option value="OPTIONAL">Optional</option>
          </select>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => deleteRow({ projectId, documentId: doc.id })} title="Remove document">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {atts.map((a) => (
        <div key={a.id} className="ml-4 mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <a href={a.externalUrl || fileHref(a.fileId)} target="_blank" rel="noreferrer" className="truncate underline hover:text-foreground">
            {a.fileName || a.externalUrl || "Attachment"}
          </a>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment({ documentId: doc.id, projectId, attachmentId: a.id })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {showAssign && (
        <div className="ml-4 mt-2 flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
          <Field label="Trade name"><Input className="h-8" value={assignName} onChange={(e) => setAssignName(e.target.value)} placeholder="ABC Electrical" /></Field>
          <Field label="Trade email"><Input className="h-8" type="email" value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder="trade@example.com" /></Field>
          <Button size="sm" onClick={onAssign} disabled={assigning}>{assigning ? "Assigning…" : "Send request"}</Button>
        </div>
      )}
    </div>
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
  const { data: readiness } = useGetCommercialHandoverReadinessQuery(registrationId);
  // The readiness DTO carries no lifecycle — only the handover record does. Read
  // the record so a handed-over unit shows its lifecycle badge instead of a live
  // (and, server-side, rejected) "Hand over" button.
  const { data: record } = useGetHandoverRecordQuery(registrationId);
  const [handover, { isLoading }] = useExecuteHandoverMutation();
  const { toast } = useToast();
  const done = record?.lifecycle;

  const onHandover = async () => {
    try {
      await handover({ registrationId, confirmAccuracy: true, sendEmail: true }).unwrap();
      toast({ title: "Handed over", description: "Commercial handover record created." });
    } catch (e) {
      toast({ title: "Cannot hand over", description: errMessage(e, "Handover blocked."), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <div className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{label}</div>
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

// ---- Edit project details (name / address / status / dates) ----
const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

interface EditForm {
  name: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  statusId: string;
  startDate: string;
  targetEndDate: string;
}

function EditProjectDetailsDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: resp, refetch } = useProjectByIdQuery({ id: projectId });
  const project = resp?.data;
  const { data: statusResp } = useGetStatusesByModuleQuery({ module: "PROJECT" });
  const statuses = useMemo(() => statusResp?.data ?? [], [statusResp]);
  const [update, { isLoading }] = useUpdateProjectMutation();
  const { toast } = useToast();
  const [form, setForm] = useState<EditForm | null>(null);

  // Seed the form from the project each time the dialog opens. The API returns the
  // status name, not its id — resolve the id from the PROJECT status list.
  useEffect(() => {
    if (open && project) {
      const norm = (s?: string | null) => (s ?? "").toLowerCase().replace(/[\s_]/g, "");
      const matchedStatusId = statuses.find((s) => norm(s.name) === norm(project.status))?.id ?? "";
      setForm({
        name: project.name ?? "",
        address: project.address ?? "",
        city: project.city ?? "",
        state: project.state ?? "",
        postcode: project.postcode ?? "",
        statusId: matchedStatusId,
        startDate: project.startDate ?? "",
        targetEndDate: project.targetEndDate ?? "",
      });
    }
  }, [open, project, statuses]);

  const set = (patch: Partial<EditForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const onSave = async () => {
    if (!form || !project) return;
    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.state || !form.postcode.trim() || !form.statusId) {
      toast({ title: "Fill in name, address, city, state, postcode and status", variant: "destructive" });
      return;
    }
    try {
      const res = await update({
        id: projectId,
        body: {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state,
          postcode: form.postcode.trim(),
          // Preserve segment + non-edited fields; buildingClass stays null for commercial.
          propertyType: project.propertyType ?? "commercial",
          buildingClass: null,
          startDate: form.startDate || project.startDate || "",
          targetEndDate: form.targetEndDate || project.targetEndDate || "",
          statusId: form.statusId,
          description: project.description ?? "",
          activitiesVisibleToHomeowner: project.activitiesVisibleToHomeowner ?? true,
        },
      }).unwrap();
      if (!res?.success) {
        toast({ title: "Could not save", description: res?.message || "Please try again.", variant: "destructive" });
        return;
      }
      toast({ title: "Project updated" });
      refetch();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not save", description: errMessage(e, "Please try again."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Edit project details</DialogTitle></DialogHeader>
        {!form ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            <Field label="Project name"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="Address"><Input value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
            <div className="grid sm:grid-cols-3 gap-2">
              <Field label="City"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
              <Field label="State">
                <select className="border rounded-md h-10 px-2 text-sm w-full" value={form.state} onChange={(e) => set({ state: e.target.value })}>
                  <option value="">—</option>
                  {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Postcode"><Input value={form.postcode} onChange={(e) => set({ postcode: e.target.value })} /></Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Field label="Status">
                <select className="border rounded-md h-10 px-2 text-sm w-full" value={form.statusId} onChange={(e) => set({ statusId: e.target.value })}>
                  <option value="">—</option>
                  {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Start date"><Input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
              <Field label="Target end date"><Input type="date" value={form.targetEndDate} onChange={(e) => set({ targetEndDate: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={onSave} disabled={isLoading}>{isLoading ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
