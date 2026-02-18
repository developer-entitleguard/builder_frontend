import { useState, useEffect, useCallback } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateApprovalMutation } from "@/store/api/approvals";

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
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoadingRegistrations(true);
    try {
      const { data, error } = await supabase
        .from('homeowner_registrations')
        .select('id, customer_name, customer_email')
        .eq('project_id', projectId);
      
      if (error) {
        throw error;
      }
      setRegistrations((data as Registration[]) || []);
    } catch (error: unknown) {
      toast({
        title: "Error fetching registrations",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load homeowner registrations.",
        variant: "destructive",
      });
    } finally {
      setLoadingRegistrations(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (open && projectId) {
      void fetchRegistrations();
    }
  }, [open, projectId, fetchRegistrations]);

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

    // First, try the builder POST /api/builder/projects/{projectId}/activities/{activityId}/approvals
    // This should always be attempted, regardless of Supabase availability.
    try {
      const body = {
        approvalType: approvalType,
        approverEmail: approverEmail.trim() || "",
        approverName: approverName.trim() || "",
        description: description.trim() || "",
        dueBy: dueBy || "",
        registrationId: registrationId || "",
        statusId: "pending",
        title: title.trim(),
      };

      await createApprovalMutation({
        projectId,
        activityId,
        body,
      }).unwrap();
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
    } catch (error: unknown) {
      toast({
        title: "Error requesting approval",
        description:
          error instanceof Error ? error.message : "Failed to submit approval request.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
    
    if (result) {
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
