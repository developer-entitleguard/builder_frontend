import { useState, useEffect } from "react";
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
  onSubmit: (activityId: string, data: CreateApprovalData) => Promise<any>;
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

  useEffect(() => {
    if (open && projectId) {
      fetchRegistrations();
    }
  }, [open, projectId]);

  const fetchRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const { data, error } = await supabase
        .from('homeowner_registrations')
        .select('id, customer_name, customer_email')
        .eq('project_id', projectId);
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoadingRegistrations(false);
    }
  };

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
    const result = await onSubmit(activityId, {
      approval_type: approvalType,
      title: title.trim(),
      description: description.trim() || null,
      registration_id: registrationId || null,
      approver_name: approverName.trim() || null,
      approver_email: approverEmail.trim() || null,
      due_by: dueBy || null
    });
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
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div>
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

          <div>
            <Label htmlFor="approval-title">Title *</Label>
            <Input
              id="approval-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Foundation inspection sign-off"
              className="mt-1.5"
            />
          </div>
          
          <div>
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

          <div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="approver-name">Approver Name</Label>
              <Input
                id="approver-name"
                value={approverName}
                onChange={e => setApproverName(e.target.value)}
                placeholder="e.g., John Smith"
                className="mt-1.5"
              />
            </div>
            <div>
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

          <div>
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
