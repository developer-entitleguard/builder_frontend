import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, Plus, Trash2, X } from "lucide-react";
import {
  errorStatus,
  pastHomesErrorMessage,
  useConfirmPastHomeRowMutation,
  useGetPastHomeBatchQuery,
  useMarkPastHomeOwnerChangedMutation,
  useOpenPastHomeFileMutation,
  useSkipPastHomeRowMutation,
  type ConfirmInput,
  type PastHomeFile,
  type PastHomeRow,
  type ProposalField,
  type Source,
} from "@/store/api/pastHomes";
import { CoverChips, FileStatusBadge, RowStatusBadge } from "@/components/pastHomes/PastHomesBadges";
import { LOW_CONFIDENCE, humanise, isAnyFileStored, parseProposals } from "@/components/pastHomes/pastHomesCopy";

type HomeField =
  | "address"
  | "unitNumber"
  | "suburb"
  | "state"
  | "postcode"
  | "propertyType"
  | "completionDate"
  | "contractDate"
  | "ocDate"
  | "planName"
  | "projectReference"
  | "ownerFirstName"
  | "ownerLastName"
  | "ownerEmail"
  | "ownerPhone";

const HOME_FIELDS: { key: HomeField; label: string; type?: string; required?: boolean }[] = [
  { key: "address", label: "Street address", required: true },
  { key: "unitNumber", label: "Unit number" },
  { key: "suburb", label: "Suburb" },
  { key: "state", label: "State" },
  { key: "postcode", label: "Postcode" },
  { key: "propertyType", label: "Property type" },
  { key: "completionDate", label: "Completion date", type: "date", required: true },
  { key: "contractDate", label: "Contract date", type: "date" },
  { key: "ocDate", label: "Occupation certificate date", type: "date" },
  { key: "planName", label: "Plan name" },
  { key: "projectReference", label: "Project reference" },
  { key: "ownerFirstName", label: "Owner first name", required: true },
  { key: "ownerLastName", label: "Owner last name" },
  { key: "ownerEmail", label: "Owner email", type: "email" },
  { key: "ownerPhone", label: "Owner phone" },
];

const DATE_FIELDS: HomeField[] = ["completionDate", "contractDate", "ocDate"];

/** Proposal home names (snake_case from the reader) → form fields. */
const HOME_PROPOSAL_FIELD: Record<string, HomeField> = {
  address: "address",
  completion_date: "completionDate",
  contract_date: "contractDate",
  oc_date: "ocDate",
};

type ItemField = "product" | "brand" | "model" | "serial" | "tradeName" | "licenceNumber";

const ITEM_FIELDS: { key: ItemField; label: string }[] = [
  { key: "product", label: "Product" },
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "serial", label: "Serial" },
  { key: "tradeName", label: "Trade" },
  { key: "licenceNumber", label: "Licence number" },
];

/** Proposal item names → item fields. warranty_period_months has no confirm field. */
const ITEM_PROPOSAL_FIELD: Record<string, ItemField> = {
  product: "product",
  brand: "brand",
  model: "model",
  serial: "serial",
  trade_name: "tradeName",
  licence_number: "licenceNumber",
};

type ItemState = Record<ItemField, string> & { source: Source | null; key: number };

const emptyItem = (key: number): ItemState => ({
  product: "",
  brand: "",
  model: "",
  serial: "",
  tradeName: "",
  licenceNumber: "",
  source: null,
  key,
});

/** Date proposals may arrive as dd/mm/yyyy; the date input needs yyyy-mm-dd. */
const toIsoDate = (v: string): string | null => {
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
};

const fromRow = (r: PastHomeRow): Record<HomeField, string> => {
  const out = {} as Record<HomeField, string>;
  for (const f of HOME_FIELDS) out[f.key] = (r[f.key] as string | null) ?? "";
  return out;
};

const isLow = (c: number | null | undefined) => typeof c === "number" && c < LOW_CONFIDENCE;

const ConfidenceTag = ({ confidence }: { confidence: number | null | undefined }) =>
  isLow(confidence) ? (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1">
      <AlertTriangle className="h-3 w-3" />
      Low confidence, check it
    </Badge>
  ) : typeof confidence === "number" ? (
    <span className="text-xs text-muted-foreground">{Math.round(confidence * 100)}% sure</span>
  ) : null;

const SourceTag = ({ source, files, onClear }: { source: Source; files: PastHomeFile[]; onClear: () => void }) => {
  const f = files.find((x) => x.id === source.fileId);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-700">
      From {f?.fileName ?? "a document"}
      {source.page != null ? `, page ${source.page}` : ""}
      <button type="button" onClick={onClear} className="hover:text-foreground" aria-label="Mark as typed by me">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
};

const PastHomeConfirm = () => {
  const { batchId = "", rowId = "" } = useParams<{ batchId: string; rowId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pollMs, setPollMs] = useState(0);
  const { data, isLoading, error } = useGetPastHomeBatchQuery({ batchId }, { skip: !batchId, pollingInterval: pollMs });
  const rowView = data?.rows.find((r) => r.row.id === rowId);
  const files = useMemo(() => rowView?.files ?? [], [rowView]);
  const wantPoll = isAnyFileStored(files) ? 4000 : 0;
  if (wantPoll !== pollMs) setPollMs(wantPoll);

  const [confirmRow, { isLoading: saving }] = useConfirmPastHomeRowMutation();
  const [skipRow, { isLoading: skipping }] = useSkipPastHomeRowMutation();
  const [ownerChangedMut, { isLoading: markingOwner }] = useMarkPastHomeOwnerChangedMutation();

  const [openFileMut] = useOpenPastHomeFileMutation();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const openFile = async (file: PastHomeFile) => {
    // Open the tab synchronously so the browser does not block it as a pop-up.
    const tab = window.open("", "_blank");
    setOpeningId(file.id);
    try {
      const url = await openFileMut({ batchId, id: file.id }).unwrap();
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
      // Give the new tab time to load before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      toast({ title: "Could not open the file", description: pastHomesErrorMessage(e), variant: "destructive" });
    } finally {
      setOpeningId(null);
    }
  };

  const [form, setForm] = useState<Record<HomeField, string> | null>(null);
  const [ownerChanged, setOwnerChanged] = useState(false);
  const [sources, setSources] = useState<Partial<Record<HomeField, Source>>>({});
  const [items, setItems] = useState<ItemState[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Seed the form once from the row.
  useEffect(() => {
    if (rowView && form === null) {
      setForm(fromRow(rowView.row));
      setOwnerChanged(!!rowView.row.ownerChanged);
    }
  }, [rowView, form]);

  const setField = (k: HomeField, v: string) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    // A value typed by hand is no longer the document's value.
    setSources((s) => {
      if (!s[k]) return s;
      const n = { ...s };
      delete n[k];
      return n;
    });
  };

  const applyHomeProposal = (file: PastHomeFile, p: ProposalField) => {
    const field = HOME_PROPOSAL_FIELD[p.name];
    if (!field || p.value == null) return;
    let value = String(p.value);
    if (DATE_FIELDS.includes(field)) {
      const iso = toIsoDate(value);
      if (!iso) {
        toast({ title: "Could not read that date", description: `“${value}”. Type it in instead.`, variant: "destructive" });
        return;
      }
      value = iso;
    }
    setForm((f) => (f ? { ...f, [field]: value } : f));
    setSources((s) => ({ ...s, [field]: { fileId: file.id, page: p.source_page ?? null } }));
  };

  const addItem = (seed?: Partial<ItemState>) => {
    const key = nextKey;
    setNextKey(key + 1);
    setItems((list) => [...list, { ...emptyItem(key), ...seed, key }]);
    setActiveItem(key);
  };

  const setItemField = (key: number, k: ItemField, v: string) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, [k]: v } : it)));

  const addProposedItem = (file: PastHomeFile, fields: ProposalField[]) => {
    const seed: Partial<ItemState> = {};
    let page: number | null = null;
    for (const p of fields) {
      const k = ITEM_PROPOSAL_FIELD[p.name];
      if (k && p.value != null) seed[k] = String(p.value);
      if (page == null && p.source_page != null) page = p.source_page;
    }
    addItem({ ...seed, source: { fileId: file.id, page } });
  };

  const applyItemProposal = (file: PastHomeFile, p: ProposalField) => {
    const k = ITEM_PROPOSAL_FIELD[p.name];
    if (!k || p.value == null) return;
    const source = { fileId: file.id, page: p.source_page ?? null };
    if (activeItem == null || !items.some((i) => i.key === activeItem)) {
      addItem({ [k]: String(p.value), source });
      return;
    }
    setItems((list) => list.map((it) => (it.key === activeItem ? { ...it, [k]: String(p.value), source } : it)));
  };

  const submit = async (duplicateAction: ConfirmInput["duplicateAction"]) => {
    if (!form) return;
    setFormError(null);
    const str = (k: HomeField) => form[k];
    const date = (k: HomeField) => (form[k] ? form[k] : null);
    const input: ConfirmInput = {
      address: str("address"),
      unitNumber: str("unitNumber"),
      suburb: str("suburb"),
      state: str("state"),
      postcode: str("postcode"),
      propertyType: str("propertyType"),
      completionDate: date("completionDate"),
      contractDate: date("contractDate"),
      ocDate: date("ocDate"),
      planName: str("planName"),
      projectReference: str("projectReference"),
      ownerFirstName: str("ownerFirstName"),
      ownerLastName: str("ownerLastName"),
      ownerEmail: str("ownerEmail"),
      ownerPhone: str("ownerPhone"),
      ownerChanged,
      items: items
        .filter((it) => ITEM_FIELDS.some((f) => it[f.key].trim()))
        .map((it) => ({
          product: it.product.trim() || null,
          brand: it.brand.trim() || null,
          model: it.model.trim() || null,
          serial: it.serial.trim() || null,
          tradeName: it.tradeName.trim() || null,
          licenceNumber: it.licenceNumber.trim() || null,
          source: it.source,
        })),
      sources: sources as Record<string, Source>,
      duplicateAction,
    };
    try {
      const row = await confirmRow({ batchId, rowId, input }).unwrap();
      toast({
        title:
          row.status === "MERGED"
            ? "Merged with the existing record"
            : row.status === "SKIPPED"
              ? "Home skipped"
              : "Home confirmed",
      });
      navigate(`/past-homes/${batchId}`);
    } catch (e) {
      const msg = pastHomesErrorMessage(e, "Could not confirm this home");
      if (errorStatus(e) === 409 && /already on record/i.test(msg)) {
        setDuplicate(true);
        return;
      }
      setFormError(msg);
    }
  };

  const doSimple = async (p: Promise<unknown>, ok: string, bad: string) => {
    try {
      await p;
      toast({ title: ok });
      navigate(`/past-homes/${batchId}`);
    } catch (e) {
      toast({ title: bad, description: pastHomesErrorMessage(e), variant: "destructive" });
    }
  };

  const shell = (body: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">{body}</main>
    </div>
  );

  if (isLoading) return shell(<Skeleton className="h-96 w-full" />);
  if (error || !data || !rowView) {
    return shell(
      <>
        <p className="text-destructive">{pastHomesErrorMessage(error, "Could not find this home")}</p>
        <Button asChild variant="link" className="px-0">
          <Link to={`/past-homes/${batchId}`}>Back to the import</Link>
        </Button>
      </>,
    );
  }

  const row = rowView.row;
  const editable = (row.status === "PROPOSED" || row.status === "ERROR") && data.batch.status !== "ROLLED_BACK";

  return shell(
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="link" className="px-0 h-auto mb-1">
            <Link to={`/past-homes/${batchId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {data.batch.fileName || "Import"}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Row {row.rowNumber}: check and confirm
            <RowStatusBadge status={row.status} />
          </h1>
          <div className="mt-2">
            <CoverChips positions={rowView.coverPosition} />
          </div>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={skipping}
              onClick={() => doSimple(skipRow({ batchId, rowId }).unwrap(), "Home skipped", "Could not skip")}
            >
              Skip
            </Button>
            <Button
              variant="outline"
              disabled={markingOwner || row.activationState === "OWNER_CHANGED"}
              onClick={() =>
                doSimple(
                  ownerChangedMut({ batchId, rowId }).unwrap(),
                  "Marked as owner changed",
                  "Could not update the home",
                )
              }
            >
              Owner changed / sold
            </Button>
          </div>
        )}
      </div>

      {row.error && (
        <Alert variant="destructive">
          <AlertTitle>This row needs fixing</AlertTitle>
          <AlertDescription>{row.error}</AlertDescription>
        </Alert>
      )}

      {duplicate && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This address is already on record</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Merge fills in only what the existing record is missing; nothing on it is overwritten, and the
              owner is not invited again. Skip leaves the existing record as it is and does not add this row.
            </p>
            <div className="flex gap-2">
              <Button size="sm" disabled={saving} onClick={() => submit("MERGE")}>
                Merge into the existing record
              </Button>
              <Button size="sm" variant="outline" disabled={saving} onClick={() => submit("SKIP")}>
                Skip this home
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!editable && (
        <p className="text-sm text-muted-foreground">This home has already been dealt with and cannot be changed here.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: the row's values ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Home details</CardTitle>
              <CardDescription>
                Check each value. Click a suggestion on the right to use it; we note which document it came from.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {form &&
                HOME_FIELDS.map((f) => (
                  <div key={f.key} className={f.key === "address" ? "sm:col-span-2 space-y-1" : "space-y-1"}>
                    <Label htmlFor={`ph-${f.key}`}>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <Input
                      id={`ph-${f.key}`}
                      type={f.type ?? "text"}
                      value={form[f.key]}
                      disabled={!editable}
                      onChange={(e) => setField(f.key, e.target.value)}
                    />
                    {sources[f.key] && (
                      <SourceTag
                        source={sources[f.key] as Source}
                        files={files}
                        onClear={() =>
                          setSources((s) => {
                            const n = { ...s };
                            delete n[f.key];
                            return n;
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              <div className="sm:col-span-2 flex items-center gap-2">
                <Checkbox
                  id="ph-ownerChanged"
                  checked={ownerChanged}
                  disabled={!editable}
                  onCheckedChange={(v) => setOwnerChanged(v === true)}
                />
                <Label htmlFor="ph-ownerChanged">The owner has changed or the home was sold (do not invite)</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Items</CardTitle>
                <CardDescription>Products and trades in the home. Click an item to make it the target for suggestions.</CardDescription>
              </div>
              {editable && (
                <Button size="sm" variant="outline" onClick={() => addItem()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add item
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
              {items.map((it, idx) => (
                <div
                  key={it.key}
                  onClick={() => setActiveItem(it.key)}
                  className={`rounded-md border p-3 space-y-2 cursor-pointer ${activeItem === it.key ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      {it.source && (
                        <SourceTag
                          source={it.source}
                          files={files}
                          onClear={() =>
                            setItems((list) => list.map((x) => (x.key === it.key ? { ...x, source: null } : x)))
                          }
                        />
                      )}
                      {editable && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label="Remove item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItems((list) => list.filter((x) => x.key !== it.key));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ITEM_FIELDS.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          value={it[f.key]}
                          disabled={!editable}
                          onChange={(e) => setItemField(it.key, f.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {editable && (
            <div className="flex gap-2">
              <Button onClick={() => submit(null)} disabled={saving || !form}>
                {saving ? "Saving…" : "Confirm this home"}
              </Button>
              <Button variant="ghost" asChild>
                <Link to={`/past-homes/${batchId}`}>Cancel</Link>
              </Button>
            </div>
          )}
        </div>

        {/* ── Right: files and what we read from them ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Handover documents</CardTitle>
              <CardDescription>
                Values we read from this home's files. Anything marked low confidence needs a careful check.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {files.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No files linked to this home. Upload them from the import page, or type the values in.
                </p>
              )}
              {files.map((file) => {
                const proposals = parseProposals(file.proposalsJson);
                return (
                  <div key={file.id} className="rounded-md border p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium text-sm">{file.fileName}</span>
                      {file.documentClass && (
                        <span className="text-xs text-muted-foreground">{humanise(file.documentClass)}</span>
                      )}
                      <FileStatusBadge file={file} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto h-7"
                        disabled={openingId === file.id}
                        onClick={() => openFile(file)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {openingId === file.id ? "Opening…" : "Open"}
                      </Button>
                    </div>
                    {file.status === "NO_PROPOSAL" && (
                      <p className="text-xs text-muted-foreground">We could not suggest values from this file. Type them in on the left.</p>
                    )}

                    {proposals.home.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">Home</div>
                        {proposals.home.map((p, i) => {
                          const field = HOME_PROPOSAL_FIELD[p.name];
                          return (
                            <div key={`${p.name}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-muted-foreground w-36 shrink-0">{humanise(p.name)}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-auto py-1 whitespace-normal text-left"
                                disabled={!editable || !field || p.value == null}
                                onClick={() => applyHomeProposal(file, p)}
                                title={field ? "Use this value" : undefined}
                              >
                                {p.value == null ? "—" : String(p.value)}
                              </Button>
                              {p.source_page != null && <span className="text-xs text-muted-foreground">p. {p.source_page}</span>}
                              <ConfidenceTag confidence={p.confidence} />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {proposals.items.map((item, idx) => (
                      <div key={idx} className="space-y-1 border-t pt-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold uppercase text-muted-foreground">Item {idx + 1}</div>
                          {editable && (
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => addProposedItem(file, item.fields)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Add as item
                            </Button>
                          )}
                        </div>
                        {item.fields.map((p, j) => {
                          const k = ITEM_PROPOSAL_FIELD[p.name];
                          return (
                            <div key={`${p.name}-${j}`} className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-muted-foreground w-36 shrink-0">{humanise(p.name)}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-auto py-1 whitespace-normal text-left"
                                disabled={!editable || !k || p.value == null}
                                onClick={() => applyItemProposal(file, p)}
                                title={k ? "Copy into the selected item" : "Not saved on this screen"}
                              >
                                {p.value == null ? "—" : String(p.value)}
                              </Button>
                              {p.source_page != null && <span className="text-xs text-muted-foreground">p. {p.source_page}</span>}
                              <ConfidenceTag confidence={p.confidence} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>,
  );
};

export default PastHomeConfirm;
