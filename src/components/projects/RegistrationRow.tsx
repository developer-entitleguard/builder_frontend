import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Calendar, Pencil, Check, Loader2, Hammer } from "lucide-react";
import { format } from "date-fns";
import type { RegistrationDetailsPatch } from "@/components/registrations/EditRegistrationDialog";

export interface RegistrationRowData {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  property_address: string;
  status: string;
  status_name: string | null;
  settlement_date: string | null;
  built_by_name: string | null;
  first_name: string;
  last_name: string;
  unit_number: string;
  total_built_up_area: number | null;
}

type SaveState = "idle" | "saving" | "saved";

interface RegistrationRowProps {
  registration: RegistrationRowData;
  editMode: boolean;
  isSelected: boolean;
  handed: boolean;
  statusConfig: { color: string; label: string };
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (reg: RegistrationRowData) => void;
  /** Persist a partial change; resolves true on success. */
  onUpdate: (id: string, patch: RegistrationDetailsPatch) => Promise<boolean>;
}

/**
 * A single registration line. In read mode it shows contact + address and opens
 * the detail page on click. In edit mode the customer details, unit number and
 * built-up area become inline fields that autosave (debounced + flush on blur),
 * mirroring the Activities inline-edit pattern. Handed-over rows stay read-only.
 */
export const RegistrationRow = ({
  registration,
  editMode,
  isSelected,
  handed,
  statusConfig,
  onToggleSelect,
  onOpen,
  onEdit,
  onUpdate,
}: RegistrationRowProps) => {
  const [firstName, setFirstName] = useState(registration.first_name);
  const [lastName, setLastName] = useState(registration.last_name);
  const [email, setEmail] = useState(registration.customer_email);
  const [contact, setContact] = useState(registration.customer_phone ?? "");
  const [unitNumber, setUnitNumber] = useState(registration.unit_number);
  const [builtUpArea, setBuiltUpArea] = useState(
    registration.total_built_up_area != null ? String(registration.total_built_up_area) : ""
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync local state when the underlying registration changes (e.g. refetch).
  useEffect(() => {
    setFirstName(registration.first_name);
    setLastName(registration.last_name);
    setEmail(registration.customer_email);
    setContact(registration.customer_phone ?? "");
    setUnitNumber(registration.unit_number);
    setBuiltUpArea(
      registration.total_built_up_area != null ? String(registration.total_built_up_area) : ""
    );
  }, [registration]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const markSaved = (ok: boolean) => {
    setSaveState(ok ? "saved" : "idle");
    if (ok) {
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 1500);
    }
  };

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    const patch: RegistrationDetailsPatch = {};
    if (firstName !== registration.first_name) patch.firstName = firstName;
    if (lastName !== registration.last_name) patch.lastName = lastName;
    if (email !== registration.customer_email) patch.email = email;
    if (contact !== (registration.customer_phone ?? "")) patch.contact = contact;
    if (unitNumber !== registration.unit_number) patch.unitNumber = unitNumber;
    const currentArea =
      registration.total_built_up_area != null ? String(registration.total_built_up_area) : "";
    if (builtUpArea !== currentArea) {
      const trimmed = builtUpArea.trim();
      const parsed = trimmed === "" ? undefined : Number(trimmed);
      if (parsed !== undefined && Number.isFinite(parsed)) patch.totalBuiltUpArea = parsed;
    }
    if (Object.keys(patch).length === 0) return;
    setSaveState("saving");
    const ok = await onUpdate(registration.id, patch);
    markSaved(ok);
  };

  const scheduleSave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  };

  const status = statusConfig;

  return (
    <Card
      className={editMode ? "" : "cursor-pointer hover:shadow-md transition-shadow"}
      onClick={editMode ? undefined : () => onOpen(registration.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(registration.id)}
              aria-label={`Select ${registration.customer_name}`}
            />
          </div>

          {editMode && !handed ? (
            <div className="flex-1 min-w-0 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); scheduleSave(); }}
                  onBlur={() => void flush()}
                  placeholder="First name"
                  className="h-8"
                />
                <Input
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); scheduleSave(); }}
                  onBlur={() => void flush()}
                  placeholder="Last name"
                  className="h-8"
                />
                <Input
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); scheduleSave(); }}
                  onBlur={() => void flush()}
                  type="email"
                  placeholder="Email"
                  className="h-8"
                />
                <Input
                  value={contact}
                  onChange={(e) => { setContact(e.target.value); scheduleSave(); }}
                  onBlur={() => void flush()}
                  placeholder="Phone"
                  className="h-8"
                />
                <Input
                  value={unitNumber}
                  onChange={(e) => { setUnitNumber(e.target.value); scheduleSave(); }}
                  onBlur={() => void flush()}
                  placeholder="Unit number"
                  className="h-8"
                />
                <Input
                  value={builtUpArea}
                  onChange={(e) => { setBuiltUpArea(e.target.value); scheduleSave(); }}
                  onBlur={() => void flush()}
                  type="number"
                  placeholder="Built-up area"
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground h-4">
                {saveState === "saving" && (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
                )}
                {saveState === "saved" && (
                  <><Check className="h-3 w-3 text-green-600" /> Saved</>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between flex-1 min-w-0">
              <div className="min-w-0">
                <h4 className="font-medium text-foreground">{registration.customer_name}</h4>
                <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {registration.customer_email}
                  </span>
                  {registration.customer_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {registration.customer_phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {registration.property_address}
                  </span>
                  {registration.built_by_name && (
                    <span className="flex items-center gap-1">
                      <Hammer className="h-3.5 w-3.5" />
                      Built by {registration.built_by_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  {!handed && !editMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={(e) => { e.stopPropagation(); onEdit(registration); }}
                      aria-label={`Edit ${registration.customer_name}`}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  )}
                  {editMode && handed && (
                    <span className="text-xs italic text-muted-foreground">Locked (handed over)</span>
                  )}
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
                {registration.settlement_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(registration.settlement_date), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
