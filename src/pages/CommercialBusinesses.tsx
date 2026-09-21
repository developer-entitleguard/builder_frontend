import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive, Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/useEntitlements";
import { CONTACT_ROLES, ENTITY_TYPES, entityTypeLabel } from "@/lib/commercialBusiness";
import {
  BusinessContact,
  CommercialBusiness,
  useAddBusinessContactMutation,
  useArchiveCommercialBusinessMutation,
  useCreateCommercialBusinessMutation,
  useListCommercialBusinessesQuery,
  useRemoveBusinessContactMutation,
  useUpdateCommercialBusinessMutation,
} from "@/store/api/commercial";

/**
 * Commercial Business directory — view and edit the businesses a commercial
 * builder hands over to. Businesses created inline while tagging a registration
 * land here too; this is the only place their full record (trading name,
 * registered address, contacts) can be maintained. Embedded as the Businesses
 * tab of the Registrations page and served standalone at /businesses.
 */
export function BusinessDirectoryContent() {
  const { data: businesses, isLoading } = useListCommercialBusinessesQuery();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CommercialBusiness | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return businesses ?? [];
    return (businesses ?? []).filter((b) =>
      [b.legalEntityName, b.tradingName, b.abn, b.acn]
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [businesses, query]);

  return (
    <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" /> Commercial Businesses
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              The business entities your commercial projects hand over to.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> Add business</Button>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name or ABN…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legal entity</TableHead>
                  <TableHead>Trading name</TableHead>
                  <TableHead>ABN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {query ? "No businesses match your search." : "No businesses yet. They also appear here when created while tagging a registration."}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setEditing(b)}>
                    <TableCell className="font-medium">{b.legalEntityName}</TableCell>
                    <TableCell className="text-muted-foreground">{b.tradingName || "—"}</TableCell>
                    <TableCell>{b.abn}</TableCell>
                    <TableCell><Badge variant="secondary">{entityTypeLabel(b.entityType)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {(b.contacts ?? []).length > 0
                        ? (b.contacts ?? []).map((c) => c.name).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditing(b); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {editing && (
          <BusinessEditorDialog business={editing} onClose={() => setEditing(null)} />
        )}
        {creating && (
          <BusinessEditorDialog business={null} onClose={() => setCreating(false)} />
        )}
    </div>
  );
}

/** Standalone /businesses page: header + commercial-access gate around the directory. */
const CommercialBusinesses = () => {
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
        <BusinessDirectoryContent />
      </main>
    </div>
  );
};

const EMPTY: CommercialBusiness = { legalEntityName: "", abn: "", entityType: "COMPANY", contacts: [] };

function errMessage(e: unknown, fallback: string): string {
  return (e as { data?: { message?: string } })?.data?.message ?? fallback;
}

/** Full-record editor: scalars + registered address + contacts. Creates when business is null. */
function BusinessEditorDialog({ business, onClose }: { business: CommercialBusiness | null; onClose: () => void }) {
  const isNew = business == null;
  const { toast } = useToast();
  // Seed from the full fetched record so unedited fields survive the PUT (the
  // backend replaces every scalar it receives).
  const [form, setForm] = useState<CommercialBusiness>(business ?? EMPTY);
  const [confirmArchive, setConfirmArchive] = useState(false);
  // Set after a 409 ABN-duplicate warning so the next save forces creation.
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [create, { isLoading: creatingBusiness }] = useCreateCommercialBusinessMutation();
  const [update, { isLoading: saving }] = useUpdateCommercialBusinessMutation();
  const [archive, { isLoading: archiving }] = useArchiveCommercialBusinessMutation();
  const [addContact, { isLoading: addingContact }] = useAddBusinessContactMutation();
  const [removeContact] = useRemoveBusinessContactMutation();
  const [newContact, setNewContact] = useState<BusinessContact | null>(null);

  const set = (patch: Partial<CommercialBusiness>) => setForm((f) => ({ ...f, ...patch }));
  const setContact = (index: number, patch: Partial<BusinessContact>) =>
    setForm((f) => ({
      ...f,
      contacts: (f.contacts ?? []).map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const onSave = async (allowDuplicate = false) => {
    if (!form.legalEntityName.trim() || !form.abn.trim()) {
      toast({ title: "Legal entity name and ABN are required", variant: "destructive" });
      return;
    }
    try {
      if (isNew) {
        const contacts = (form.contacts ?? []).length
          ? form.contacts
          : [{ role: "PRIMARY", name: form.legalEntityName.trim() }];
        await create({ body: { ...form, contacts }, allowDuplicate }).unwrap();
        toast({ title: "Business created" });
      } else {
        await update({ id: form.id!, body: form }).unwrap();
        toast({ title: "Business updated" });
      }
      onClose();
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (isNew && status === 409 && !allowDuplicate) {
        toast({
          title: "A business with this ABN already exists",
          description: "Save again to create it anyway, or close and select the existing one.",
          variant: "destructive",
        });
        // Next save forces through the duplicate warning.
        setForceDuplicate(true);
        return;
      }
      toast({ title: "Could not save", description: errMessage(e, "Check the ABN and try again."), variant: "destructive" });
    }
  };

  const onArchive = async () => {
    try {
      await archive(form.id!).unwrap();
      toast({ title: "Business archived", description: "It stays on historical handover records." });
      onClose();
    } catch (e) {
      toast({ title: "Could not archive", description: errMessage(e, "Try again."), variant: "destructive" });
    }
  };

  const onAddContact = async () => {
    if (!newContact?.name?.trim()) {
      toast({ title: "Contact name is required", variant: "destructive" });
      return;
    }
    if (isNew) {
      set({ contacts: [...(form.contacts ?? []), newContact] });
      setNewContact(null);
      return;
    }
    try {
      await addContact({ businessId: form.id!, body: newContact }).unwrap();
      setForm((f) => ({ ...f, contacts: [...(f.contacts ?? []), newContact] }));
      setNewContact(null);
      toast({ title: "Contact added" });
    } catch (e) {
      toast({ title: "Could not add contact", description: errMessage(e, "Try again."), variant: "destructive" });
    }
  };

  const onRemoveContact = async (contact: BusinessContact, index: number) => {
    if (isNew || !contact.id) {
      set({ contacts: (form.contacts ?? []).filter((_, i) => i !== index) });
      return;
    }
    try {
      await removeContact({ businessId: form.id!, contactId: contact.id }).unwrap();
      set({ contacts: (form.contacts ?? []).filter((_, i) => i !== index) });
    } catch (e) {
      toast({ title: "Could not remove contact", description: errMessage(e, "The primary contact cannot be removed."), variant: "destructive" });
    }
  };

  const busy = saving || creatingBusiness;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add business" : form.legalEntityName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="grid sm:grid-cols-2 gap-3">
            <Field label="Legal entity name *"><Input value={form.legalEntityName} onChange={(e) => set({ legalEntityName: e.target.value })} /></Field>
            <Field label="Trading name"><Input value={form.tradingName ?? ""} onChange={(e) => set({ tradingName: e.target.value || null })} /></Field>
            <Field label="ABN *"><Input value={form.abn} onChange={(e) => set({ abn: e.target.value })} placeholder="11-digit ABN" /></Field>
            <Field label="ACN"><Input value={form.acn ?? ""} onChange={(e) => set({ acn: e.target.value || null })} /></Field>
            <Field label="Entity type *">
              <select className="border rounded-md h-10 px-2 text-sm w-full" value={form.entityType} onChange={(e) => set({ entityType: e.target.value })}>
                {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Industry division"><Input value={form.industryDivision ?? ""} onChange={(e) => set({ industryDivision: e.target.value || null })} /></Field>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Registered address</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Street"><Input value={form.registeredStreet ?? ""} onChange={(e) => set({ registeredStreet: e.target.value || null })} /></Field>
              <Field label="City / suburb"><Input value={form.registeredCity ?? ""} onChange={(e) => set({ registeredCity: e.target.value || null })} /></Field>
              <Field label="State"><Input value={form.registeredState ?? ""} onChange={(e) => set({ registeredState: e.target.value || null })} /></Field>
              <Field label="Postcode"><Input value={form.registeredPostcode ?? ""} onChange={(e) => set({ registeredPostcode: e.target.value || null })} /></Field>
              <Field label="Country"><Input value={form.registeredCountry ?? ""} onChange={(e) => set({ registeredCountry: e.target.value || null })} /></Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Contacts</h3>
            <div className="space-y-2">
              {(form.contacts ?? []).map((c, i) => (
                <div key={c.id ?? `new-${i}`} className="rounded-md border p-3 grid sm:grid-cols-2 gap-2 relative">
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <Badge variant={c.role === "PRIMARY" ? "default" : "secondary"}>{c.role}</Badge>
                    {c.role !== "PRIMARY" && (
                      <Button variant="ghost" size="icon" onClick={() => onRemoveContact(c, i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Field label="Name *"><Input value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} /></Field>
                  <Field label="Title"><Input value={c.title ?? ""} onChange={(e) => setContact(i, { title: e.target.value || null })} /></Field>
                  <Field label="Email"><Input type="email" value={c.email ?? ""} onChange={(e) => setContact(i, { email: e.target.value || null })} /></Field>
                  <Field label="Phone"><Input value={c.phone ?? ""} onChange={(e) => setContact(i, { phone: e.target.value || null })} /></Field>
                </div>
              ))}

              {newContact ? (
                <div className="rounded-md border bg-muted/30 p-3 grid sm:grid-cols-2 gap-2">
                  <Field label="Role">
                    <select className="border rounded-md h-10 px-2 text-sm w-full" value={newContact.role}
                      onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}>
                      {CONTACT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Name *"><Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} /></Field>
                  <Field label="Email"><Input type="email" value={newContact.email ?? ""} onChange={(e) => setNewContact({ ...newContact, email: e.target.value || null })} /></Field>
                  <Field label="Phone"><Input value={newContact.phone ?? ""} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value || null })} /></Field>
                  <div className="sm:col-span-2 flex gap-2">
                    <Button size="sm" onClick={onAddContact} disabled={addingContact}>{addingContact ? "Adding…" : "Add contact"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewContact(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setNewContact({ role: (form.contacts ?? []).some((c) => c.role === "PRIMARY") ? "BILLING" : "PRIMARY", name: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Add contact
                </Button>
              )}
            </div>
          </section>

          <div className="flex items-center justify-between pt-2 border-t">
            {!isNew ? (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmArchive(true)} disabled={archiving}>
                <Archive className="h-4 w-4 mr-1" /> Archive
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => onSave(forceDuplicate)} disabled={busy}>
                {busy ? "Saving…" : isNew ? (forceDuplicate ? "Create anyway" : "Create") : "Save changes"}
              </Button>
            </div>
          </div>
        </div>

        <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {form.legalEntityName}?</AlertDialogTitle>
              <AlertDialogDescription>
                It will no longer be selectable when tagging registrations. Historical
                handover records keep referencing it. If it is still tagged to a
                registration that has not been handed over, re-tag that registration first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onArchive}>Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default CommercialBusinesses;
