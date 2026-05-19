import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateApprovalData, ApprovalType } from "@/hooks/useApprovals";
import { useToast } from "@/hooks/use-toast";
import { useCreateApprovalMutation } from "@/store/api/approvals";
import { useGetProjectRegistrationsQuery } from "@/store/api/projects";
import { useGetStatusesByModuleQuery } from "@/store/api/status";

interface Registration {
  id: string;
  customer_name: string;
  customer_email: string;
}

interface RequestApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  activityName: string;
  projectId: string;
  onSubmit: (activityId: string, data: CreateApprovalData) => Promise<unknown>;
}

const approvalTypes: ApprovalType[] = [
  'Scope Change',
  'Variation',
  'Material Change',
  'Schedule Change',
  'Payment Milestone',
  'Other'
];

export const RequestApprovalDialog = ({ 
  open, 
  onOpenChange, 
  activityId, 
  activityName,
  projectId,
  onSubmit 
}: RequestApprovalDialogProps) => {
  const { toast } = useToast();
  const [createApprovalMutation] = useCreateApprovalMutation();
  const [approvalType, setApprovalType] = useState<ApprovalType>('Other');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [registrationId, setRegistrationId] = useState<string>("");
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [dueBy, setDueBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    data: projectRegistrationsResponse,
    isLoading: loadingRegistrations,
  } = useGetProjectRegistrationsQuery(
    { projectId },
    { skip: !projectId }
  );

  const registrations: Registration[] =
    (projectRegistrationsResponse?.data ?? []).map((raw) => {
      const r = raw as {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        customerName?: string;
        customer_email?: string;
        customerEmail?: string;
      };
      const fullName = [r.firstName, r.lastName].filter(Boolean).join(" ");
      const name =
        fullName ||
        r.customerName ||
        r.customer_email ||
        r.customerEmail ||
        r.email ||
        "";
      const email =
        r.email ??
        r.customerEmail ??
        r.customer_email ??
        "";
      return {
        id: r.id,
        customer_name: name || "(No name)",
        customer_email: email,
      };
    });

  const { data: approvalStatusResponse } = useGetStatusesByModuleQuery({
    module: "APPROVAL_REQUEST",
  });
  const pendingStatusId =
    approvalStatusResponse?.data.find(
      (s) => (s.name ?? "").toUpperCase() === "PENDING"
    )?.id ?? null;

  const handleRegistrationChange = (regId: string) => {
    const actualId = regId === "none" ? "" : regId;
    setRegistrationId(actualId);
    const registration = registrations.find(r => r.id === actualId);
    if (registration) {
      setApproverName(registration.customer_name);
      setApproverEmail(registration.customer_email);
    } else {
      setApproverName("");
      setApproverEmail("");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !approvalType) return;
    
    setIsSubmitting(true);
    let result: unknown = null;
    let builderResult: { success?: boolean; message?: string } | null = null;

    // First, try the builder POST /api/builder/projects/{projectId}/activities/{activityId}/approvals
    // This should always be attempted, regardless of Supabase availability.
    try {
      const statusId = pendingStatusId ?? "pending";
      const body = {
        approvalType: approvalType,
        approverEmail: approverEmail.trim() || "",
        approverName: approverName.trim() || "",
        description: description.trim() || "",
        dueBy: dueBy || "",
        registrationId: registrationId || "",
        statusId,
        title: title.trim(),
      };

      builderResult = await createApprovalMutation({
        projectId,
        activityId,
        body,
      }).unwrap();
      if (builderResult?.success) {
        toast({
          title: "Approval request created",
          description:
            builderResult.message ?? "Approval request created successfully.",
        });
      }
    } catch {
      // Ignore builder API errors; Supabase remains source of truth for UI
    }

    // Then, best-effort Supabase-based approval request
    try {
      result = await onSubmit(activityId, {
        approval_type: approvalType,
        title: title.trim(),
        description: description.trim() || null,
        registration_id: registrationId || null,
        approver_name: approverName.trim() || null,
        approver_email: approverEmail.trim() || null,
        due_by: dueBy || null
      });
    } catch {
      // Supabase/onSubmit errors are not surfaced to avoid duplicate or misleading toasts
    }

    setIsSubmitting(false);
    
    if (builderResult?.success || result) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setApprovalType('Other');
    setTitle("");
    setDescription("");
    setRegistrationId("");
    setApproverName("");
    setApproverEmail("");
    setDueBy("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Approval</DialogTitle>
          <DialogDescription>
            Request approval for activity: {activityName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="approval-type">Approval Type *</Label>
            <Select value={approvalType} onValueChange={v => setApprovalType(v as ApprovalType)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {approvalTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="approval-title">Title *</Label>
            <Input
              id="approval-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Foundation inspection sign-off"
              className="mt-1.5"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="approval-description">Description</Label>
            <Textarea
              id="approval-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional details about what needs approval..."
              className="mt-1.5"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="registration">Link to Registration (for email approval)</Label>
            <Select value={registrationId || "none"} onValueChange={handleRegistrationChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={loadingRegistrations ? "Loading..." : "Select registration..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No registration</SelectItem>
                {registrations.map(reg => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.customer_name} ({reg.customer_email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="approver-name">Approver Name</Label>
              <Input
                id="approver-name"
                value={approverName}
                onChange={e => setApproverName(e.target.value)}
                placeholder="e.g., John Smith"
                className="mt-1.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="approver-email">Approver Email</Label>
              <Input
                id="approver-email"
                type="email"
                value={approverEmail}
                onChange={e => setApproverEmail(e.target.value)}
                placeholder="e.g., john@example.com"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due-by">Due By (optional)</Label>
            <Input
              id="due-by"
              type="date"
              value={dueBy}
              onChange={e => setDueBy(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Request Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
