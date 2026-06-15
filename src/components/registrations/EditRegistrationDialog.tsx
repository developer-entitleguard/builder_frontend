import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EditRegistrationValues {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  unitNumber: string;
  totalBuiltUpArea: string; // kept as string for the input; parsed on submit
}

export interface RegistrationDetailsPatch {
  firstName?: string;
  lastName?: string;
  email?: string;
  contact?: string;
  unitNumber?: string;
  totalBuiltUpArea?: number;
}

interface EditRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: EditRegistrationValues;
  loading?: boolean;
  onConfirm: (patch: RegistrationDetailsPatch) => void;
}

/**
 * Inline edit for a registration's customer details, unit number and built-up
 * area — no round-trip back to onboarding. Only changed fields are submitted.
 */
export const EditRegistrationDialog = ({
  open,
  onOpenChange,
  initial,
  loading,
  onConfirm,
}: EditRegistrationDialogProps) => {
  const [values, setValues] = useState<EditRegistrationValues>(initial);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  const set = (key: keyof EditRegistrationValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const patch: RegistrationDetailsPatch = {};
    if (values.firstName !== initial.firstName) patch.firstName = values.firstName;
    if (values.lastName !== initial.lastName) patch.lastName = values.lastName;
    if (values.email !== initial.email) patch.email = values.email;
    if (values.contact !== initial.contact) patch.contact = values.contact;
    if (values.unitNumber !== initial.unitNumber) patch.unitNumber = values.unitNumber;
    if (values.totalBuiltUpArea !== initial.totalBuiltUpArea) {
      const trimmed = values.totalBuiltUpArea.trim();
      const parsed = trimmed === "" ? undefined : Number(trimmed);
      if (parsed !== undefined && Number.isFinite(parsed)) {
        patch.totalBuiltUpArea = parsed;
      }
    }
    onConfirm(patch);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Registration</DialogTitle>
          <DialogDescription>
            Update the customer details, unit number and built-up area. Other
            fields are left unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-firstName">First name</Label>
            <Input
              id="edit-firstName"
              value={values.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-lastName">Last name</Label>
            <Input
              id="edit-lastName"
              value={values.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-contact">Phone</Label>
            <Input
              id="edit-contact"
              value={values.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-unitNumber">Unit number</Label>
            <Input
              id="edit-unitNumber"
              value={values.unitNumber}
              onChange={(e) => set("unitNumber", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-builtUpArea">Built-up area</Label>
            <Input
              id="edit-builtUpArea"
              type="number"
              value={values.totalBuiltUpArea}
              onChange={(e) => set("totalBuiltUpArea", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
