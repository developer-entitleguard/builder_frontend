import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetProjectRegistrationsQuery } from "@/store/api/projects";
import { useAttachComplianceByNameMutation } from "@/store/api/complianceDocuments";

/**
 * D3: upload a per-unit (registration-scope) compliance document. The user picks
 * which registration (unit) the document belongs to and uploads the file; the
 * backend finds/creates the matching line on that registration and attaches it.
 */
export function PerUnitUploadDialog({
  open,
  onOpenChange,
  projectId,
  documentName,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documentName: string;
  category?: string | null;
}) {
  const { toast } = useToast();
  const { data: regResp, isLoading } = useGetProjectRegistrationsQuery(
    { projectId },
    { skip: !open }
  );
  const [attach, { isLoading: uploading }] = useAttachComplianceByNameMutation();
  const [registrationId, setRegistrationId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const registrations = regResp?.data ?? [];

  const label = (r: (typeof registrations)[number]) => {
    const unit = r.unitNumber ? `Unit ${r.unitNumber}` : null;
    const who = r.customerName || r.propertyAddress || r.property_address || r.customerEmail;
    return [unit, who].filter(Boolean).join(" — ") || (r.id as string);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!registrationId) {
      toast({ title: "Select a unit", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Choose a file to upload", variant: "destructive" });
      return;
    }
    try {
      await attach({ registrationId, documentName, category, file, projectId }).unwrap();
      toast({ title: `${documentName} uploaded` });
      setRegistrationId("");
      if (fileRef.current) fileRef.current.value = "";
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload “{documentName}”</DialogTitle>
          <DialogDescription>
            This is a per-unit document. Choose which unit it belongs to and upload the file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Unit / registration</Label>
            <Select value={registrationId} onValueChange={setRegistrationId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading units…" : "Select a unit"} />
              </SelectTrigger>
              <SelectContent>
                {registrations.map((r) => (
                  <SelectItem key={r.id as string} value={r.id as string}>
                    {label(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && registrations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No units (registrations) on this project yet.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="per-unit-file">Document file</Label>
            <input
              id="per-unit-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.heic"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
            />
          </div>

          <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
