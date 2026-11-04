import { useMemo, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useDashboardRegistrationsQuery } from "@/store/api";
import { referralsErrorMessage, useLinkReferralToHomeMutation } from "@/store/api/referrals";

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
  statusName?: string | null;
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

const label = (r: OwnerRegistration) => {
  const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
  const place = [r.address, r.city, r.state].filter(Boolean).join(", ");
  return { name: name || "No name", place: place || "No address" };
};

interface Props {
  referralId: string | null;
  friendName: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * VR11: the friend became a customer. Picks one of the builder's homes from
 * the existing registrations list and links the referral to it.
 */
export const LinkHomeDialog = ({ referralId, friendName, onOpenChange }: Props) => {
  const { toast } = useToast();
  const builderId = useBuilderId();
  const open = !!referralId;
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, error } = useDashboardRegistrationsQuery(
    { builderId: builderId ?? "", type: "owner" },
    { skip: !open || !builderId },
  );
  const [link, { isLoading: linking }] = useLinkReferralToHomeMutation();

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
      setSelected(null);
    }
    onOpenChange(o);
  };

  const onLink = async () => {
    if (!referralId || !selected) return;
    try {
      await link({ id: referralId, registrationId: selected }).unwrap();
      toast({ title: "Referral linked to the home" });
      close(false);
    } catch (e) {
      toast({ title: "Could not link the home", description: referralsErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to a home</DialogTitle>
          <DialogDescription>
            {friendName ? `${friendName} became a customer? ` : "The friend became a customer? "}
            Choose their home so the referral is recorded against it.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by owner, email or address"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto rounded-md border">
          {isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading homes…</p>
          ) : error ? (
            <p className="p-3 text-sm text-destructive">{referralsErrorMessage(error, "Could not load homes")}</p>
          ) : filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No homes match.</p>
          ) : (
            <ul role="listbox" aria-label="Homes">
              {filtered.map((r) => {
                const l = label(r);
                const active = selected === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelected(r.id)}
                      className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted ${
                        active ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <span className="block">{l.name}</span>
                      <span className="block text-xs text-muted-foreground">{l.place}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={onLink} disabled={!selected || linking}>
            {linking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkHomeDialog;
