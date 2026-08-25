import { useEffect, useRef, useState } from "react";
import { Activity, ActivityStatus, CreateActivityData } from "@/hooks/useActivities";
import { OrgVendor } from "@/hooks/useOrgVendors";
import { ContactCombobox, ContactValue } from "./ContactCombobox";
import { useAssignActivityMutation } from "@/store/api/activities";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

const money = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `$${Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const parseMoney = (v: string): number | null => {
  const t = v.trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
};

type SaveState = "idle" | "saving" | "saved";

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
  editMode: boolean;
  isBuilder: boolean;
  isSelected: boolean;
  vendors: OrgVendor[];
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onUpdateActivity: (
    id: string,
    data: Partial<CreateActivityData & { status: ActivityStatus; completed?: boolean }>
  ) => Promise<boolean>;
  onMarkCompleteToggle: (activity: Activity, e: React.MouseEvent) => void;
}

/**
 * A single activity line. In read mode it shows quote / paid / vendor and opens
 * the detail view on click. In edit mode the name, pricing and contact become
 * inline fields that autosave (debounced + flush on blur); changing the contact
 * also fires the trade invite, mirroring the detail page.
 */
export const ActivityRow = ({
  activity,
  projectId,
  editMode,
  isBuilder,
  isSelected,
  vendors,
  onToggleSelect,
  onOpen,
  onUpdateActivity,
  onMarkCompleteToggle,
}: ActivityRowProps) => {
  const { toast } = useToast();
  const [assignActivity] = useAssignActivityMutation();

  const [name, setName] = useState(activity.name);
  const [quote, setQuote] = useState(activity.quote?.toString() ?? "");
  const [pricePaid, setPricePaid] = useState(activity.price_paid?.toString() ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  // Keep local fields in sync when the underlying activity changes (refetch).
  useEffect(() => {
    setName(activity.name);
    setQuote(activity.quote?.toString() ?? "");
    setPricePaid(activity.price_paid?.toString() ?? "");
  }, [activity.name, activity.quote, activity.price_paid]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  const markSaved = (ok: boolean) => {
    setSaveState(ok ? "saved" : "idle");
    if (ok) {
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 1500);
    }
  };

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    const trimmedName = name.trim();
    const q = parseMoney(quote);
    const p = parseMoney(pricePaid);
    const changed =
      (trimmedName !== "" && trimmedName !== activity.name) ||
      q !== (activity.quote ?? null) ||
      p !== (activity.price_paid ?? null);
    if (!changed) return;
    setSaveState("saving");
    const ok = await onUpdateActivity(activity.id, {
      name: trimmedName || activity.name,
      quote: q,
      price_paid: p,
    });
    markSaved(ok);
  };

  const scheduleSave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, 800);
  };

  const handleContact = async (contact: ContactValue) => {
    const emailChanged =
      !!contact.email.trim() && contact.email.trim() !== (activity.vendor_email ?? "");
    setSaveState("saving");
    const ok = await onUpdateActivity(activity.id, {
      vendor_name: contact.name || null,
      vendor_email: contact.email || null,
      vendor_phone: contact.phone || null,
    });
    markSaved(ok);
    if (isBuilder && emailChanged) {
      try {
        await assignActivity({
          projectId,
          activityId: activity.id,
          body: {
            assigneeName: contact.name.trim() || null,
            assigneeEmail: contact.email.trim(),
          },
        }).unwrap();
        toast({
          title: "Contact assigned",
          description: "The trade/auditor was invited to this job.",
        });
      } catch {
        toast({ title: "Couldn't assign contact", variant: "destructive" });
      }
    }
  };

  const isCompleted = activity.completed ?? activity.status === "done";
  const status = isCompleted
    ? { label: "Done", color: "bg-green-100 text-green-700" }
    : { label: "Pending", color: "bg-slate-100 text-slate-700" };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        editMode ? "" : "hover:bg-muted/20 cursor-pointer"
      }`}
      onClick={editMode ? undefined : () => onOpen(activity.id)}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(activity.id);
        }}
      >
        <Checkbox checked={isSelected} className="cursor-pointer" />
      </div>

      {editMode ? (
        <>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              scheduleSave();
            }}
            onBlur={() => void flush()}
            placeholder="Activity name"
            className="h-8 flex-1 min-w-0"
          />
          <Input
            value={quote}
            onChange={(e) => {
              setQuote(e.target.value);
              scheduleSave();
            }}
            onBlur={() => void flush()}
            type="number"
            step="0.01"
            placeholder="Quote"
            className="h-8 w-24"
          />
          <Input
            value={pricePaid}
            onChange={(e) => {
              setPricePaid(e.target.value);
              scheduleSave();
            }}
            onBlur={() => void flush()}
            type="number"
            step="0.01"
            placeholder="Paid"
            className="h-8 w-24"
          />
          <div onClick={(e) => e.stopPropagation()}>
            <ContactCombobox
              value={{
                name: activity.vendor_name,
                email: activity.vendor_email,
                phone: activity.vendor_phone,
              }}
              vendors={vendors}
              onChange={handleContact}
              placeholder="Contact…"
              align="end"
              className="h-8 w-44"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs whitespace-nowrap"
            onClick={(e) => onMarkCompleteToggle(activity, e)}
          >
            {isCompleted ? "Mark as pending" : "Mark as complete"}
          </Button>
          <span className="flex w-16 items-center gap-1 text-xs text-muted-foreground">
            {saveState === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check className="h-3 w-3 text-green-600" /> Saved
              </>
            )}
          </span>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p
              className={`font-medium text-sm ${
                isCompleted ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {activity.name}
            </p>
            {activity.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {activity.description}
              </p>
            )}
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            <span>Quote {money(activity.quote)}</span>
            <span>Paid {money(activity.price_paid)}</span>
            <span className="truncate max-w-[10rem] flex items-center gap-1">
              {/*
                A filled dot means the vendor resolved to a real directory
                record (so they can be assigned and scheduled); a hollow one
                means the row still carries text only.
              */}
              {activity.vendor_name && (
                <span
                  aria-hidden
                  title={
                    activity.vendor_id
                      ? "Linked to your vendor directory"
                      : "Not linked to your vendor directory"
                  }
                  className={
                    activity.vendor_id
                      ? "h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                      : "h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/60"
                  }
                />
              )}
              <span className="truncate">{activity.vendor_name || "—"}</span>
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs whitespace-nowrap"
            onClick={(e) => onMarkCompleteToggle(activity, e)}
          >
            {isCompleted ? "Mark as pending" : "Mark as complete"}
          </Button>
          <div className="flex items-center gap-2">
            {activity.due_date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(activity.due_date), "MMM d")}
              </span>
            )}
            <Badge variant="outline" className={`text-xs ${status.color}`}>
              {status.label}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </>
      )}
    </div>
  );
};
