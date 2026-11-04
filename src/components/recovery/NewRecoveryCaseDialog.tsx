import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useDashboardRegistrationsQuery } from "@/store/api";
import {
  recoveryErrorMessage,
  useGetRecoveryHomeItemsQuery,
  useRaiseRecoveryCaseMutation,
  type RecoveryHomeItem,
} from "@/store/api/recovery";

const NO_ITEM = "__none";

const itemLabel = (i: RecoveryHomeItem) =>
  [[i.brand, i.model].filter(Boolean).join(" "), i.productType ? `(${i.productType})` : ""].filter(Boolean).join(" ") ||
  "Item";

/** One row of /api/dashboard/getregistrations?type=owner, as Registrations.tsx reads it. */
interface OwnerRegistration {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  projectName?: string | null;
}

/** Same lookup as Registrations.tsx / CreateQuery.tsx: the stored builder org, else the current org. */
const useBuilderId = (): string | null => {
  const { organization } = useOrganization();
  return useMemo(() => {
    const raw = localStorage.getItem("userData");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.userInfo?.builderOrganization?.id) return parsed.userInfo.builderOrganization.id as string;
        if (parsed.builderOrganization?.id) return parsed.builderOrganization.id as string;
      } catch {
        /* ignore */
      }
    }
    return organization?.id ?? null;
  }, [organization?.id]);
};

const homeLabel = (r: OwnerRegistration) => {
  const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
  const place = [r.address, r.city, r.state].filter(Boolean).join(", ");
  return { place: place || "No address", name: name || r.projectName || "" };
};

/**
 * "New case" from the Recovery cases list (DR1): pick a home, optionally one
 * of its items (the chain starts from the item), then name the defect. The case page traces the record from there. To start from an
 * owner's query, use "Start a recovery case" on the query instead.
 */
const NewRecoveryCaseDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const builderId = useBuilderId();
  const [q, setQ] = useState("");
  const [home, setHome] = useState<string | null>(null);
  // Optional and never preselected; "" until the person chooses.
  const [item, setItem] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { data, isLoading, error } = useDashboardRegistrationsQuery(
    { builderId: builderId ?? "", type: "owner" },
    { skip: !open || !builderId },
  );
  const [raise, { isLoading: raising }] = useRaiseRecoveryCaseMutation();
  const { data: items, isFetching: itemsLoading, error: itemsError } = useGetRecoveryHomeItemsQuery(home ?? "", {
    skip: !open || !home,
  });

  const rows = useMemo<OwnerRegistration[]>(() => {
    const raw = (data as { data?: unknown } | undefined)?.data;
    return Array.isArray(raw) ? (raw as OwnerRegistration[]) : [];
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? rows.filter((r) =>
          [r.firstName, r.lastName, r.email, r.address, r.city, r.projectName]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term)),
        )
      : rows;
    return list.slice(0, 50);
  }, [rows, q]);

  const close = (o: boolean) => {
    if (!o) {
      setQ("");
      setHome(null);
      setItem("");
      setTitle("");
      setDescription("");
    }
    onOpenChange(o);
  };

  const submit = async () => {
    if (!home || !title.trim()) return;
    try {
      const d = await raise({
        registrationId: home,
        orderItemId: item && item !== NO_ITEM ? item : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
      }).unwrap();
      close(false);
      navigate(`/recovery/cases/${d.summary.id}`);
    } catch (e) {
      toast({ title: "Could not start the case", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New recovery case</DialogTitle>
          <DialogDescription>Choose the home, then describe the defect. You choose the recipient on the next page.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Home</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by address, owner or project"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-md border">
            {isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading homes…</p>
            ) : error ? (
              <p className="p-3 text-sm text-destructive">{recoveryErrorMessage(error, "Could not load homes")}</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No homes match.</p>
            ) : (
              <ul role="listbox" aria-label="Homes">
                {filtered.map((r) => {
                  const l = homeLabel(r);
                  const active = home === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setHome(r.id);
                          setItem("");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted ${
                          active ? "bg-muted font-medium" : ""
                        }`}
                      >
                        <span className="block">{l.place}</span>
                        {l.name && <span className="block text-xs text-muted-foreground">{l.name}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        {home && (
          <div className="space-y-1">
            <Label htmlFor="recovery-new-item">Item (optional)</Label>
            {itemsLoading ? (
              <p className="text-sm text-muted-foreground">Loading items…</p>
            ) : itemsError ? (
              <p className="text-sm text-destructive">{recoveryErrorMessage(itemsError, "Could not load the items")}</p>
            ) : !items || items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items on this home's record.</p>
            ) : (
              <Select value={item} onValueChange={setItem}>
                <SelectTrigger id="recovery-new-item">
                  <SelectValue placeholder="Choose an item, if the defect is in one" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ITEM}>Not about one item</SelectItem>
                  {items.map((i) => (
                    <SelectItem key={i.orderItemId} value={i.orderItemId}>
                      {itemLabel(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="recovery-new-title">Defect</Label>
          <Input
            id="recovery-new-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="For example: shower recess leaking"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="recovery-new-description">Description (optional)</Label>
          <Textarea
            id="recovery-new-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={4000}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!home || !title.trim() || raising}>
            {raising && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start the case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewRecoveryCaseDialog;
