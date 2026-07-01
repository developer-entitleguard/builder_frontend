import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, Link2, Trash2, FileText, ExternalLink, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/config";
import {
  useGetComplianceAttachmentsQuery,
  useUploadComplianceAttachmentMutation,
  useLinkComplianceAttachmentMutation,
  useDeleteComplianceAttachmentMutation,
  useApproveComplianceAttachmentMutation,
  useRejectComplianceAttachmentMutation,
} from "@/store/api/complianceDocuments";

interface ComplianceAttachmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: "PROJECT" | "REGISTRATION";
  ownerId: string;
  documentId: string;
  documentName: string;
  readOnly?: boolean;
}

const fileHref = (fileId: string | null): string | null =>
  fileId ? `${getApiBaseUrl()}/unsecure/download/${fileId}` : null;

export const ComplianceAttachmentsDialog = ({
  open,
  onOpenChange,
  ownerType,
  ownerId,
  documentId,
  documentName,
  readOnly = false,
}: ComplianceAttachmentsDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useGetComplianceAttachmentsQuery(
    { ownerType, ownerId, documentId },
    { skip: !open }
  );
  const [uploadAttachment, { isLoading: uploading }] = useUploadComplianceAttachmentMutation();
  const [linkAttachment, { isLoading: linking }] = useLinkComplianceAttachmentMutation();
  const [deleteAttachment] = useDeleteComplianceAttachmentMutation();
  const [approveAttachment, { isLoading: approving }] = useApproveComplianceAttachmentMutation();
  const [rejectAttachment, { isLoading: rejecting }] = useRejectComplianceAttachmentMutation();

  // Approve/reject endpoints exist only for project-scope documents.
  const canReview = ownerType === "PROJECT" && !readOnly;

  const handleApprove = async (attachmentId: string) => {
    try {
      await approveAttachment({ projectId: ownerId, documentId, attachmentId }).unwrap();
      toast({ title: "Attachment approved", description: "Document marked as received." });
    } catch {
      toast({ title: "Couldn't approve", variant: "destructive" });
    }
  };

  const handleReject = async (attachmentId: string) => {
    try {
      await rejectAttachment({
        projectId: ownerId,
        documentId,
        attachmentId,
        reason: rejectReason.trim() || undefined,
      }).unwrap();
      setRejectingId(null);
      setRejectReason("");
      toast({ title: "Attachment rejected", description: "The assignee will be asked to redo it." });
    } catch {
      toast({ title: "Couldn't reject", variant: "destructive" });
    }
  };

  const attachments = data?.data ?? [];
  const busy = uploading || linking;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const res = await uploadAttachment({
        ownerType,
        ownerId,
        documentId,
        file,
        notes: notes.trim() || undefined,
      }).unwrap();
      if (!res.success) throw new Error(res.message);
      setNotes("");
      toast({ title: "File uploaded", description: file.name });
    } catch (e) {
      toast({
        title: "Upload failed",
        description:
          e instanceof Error && e.message
            ? e.message
            : "Could not upload the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    try {
      const res = await linkAttachment({
        ownerType,
        ownerId,
        documentId,
        externalUrl: url,
        notes: notes.trim() || undefined,
      }).unwrap();
      if (!res.success) throw new Error(res.message);
      setLinkUrl("");
      setNotes("");
      toast({ title: "Link added" });
    } catch {
      toast({
        title: "Couldn't add link",
        description: "Please check the URL and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await deleteAttachment({ ownerType, ownerId, documentId, attachmentId }).unwrap();
      toast({ title: "Attachment removed" });
    } catch {
      toast({ title: "Couldn't remove attachment", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
          <DialogDescription>{documentName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!readOnly && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.heic"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note (applies to the next file or link)"
                disabled={busy}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload file
              </Button>
              <p className="text-xs text-muted-foreground">
                Allowed: PDF, PNG, JPG, JPEG, HEIC · max 10 MB
              </p>

              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://… link to an externally stored document"
                  disabled={busy}
                  onKeyDown={(e) => e.key === "Enter" && handleLink()}
                />
                <Button onClick={handleLink} disabled={busy || !linkUrl.trim()}>
                  {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Current attachments
            </Label>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No attachments yet.</p>
            ) : (
              <ul className="space-y-2">
                {attachments.map((att) => {
                  const href = att.externalUrl || fileHref(att.fileId);
                  const isLink = !!att.externalUrl;
                  return (
                    <li
                      key={att.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={href ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm truncate hover:underline"
                        >
                          {isLink ? (
                            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">
                            {att.fileName || att.externalUrl || "Attachment"}
                          </span>
                          <Badge variant="outline" className="shrink-0">
                            v{att.version}
                          </Badge>
                        </a>
                        {att.uploadedBy && att.reviewStatus === "PENDING" && (
                          <p className="mt-0.5 text-xs text-muted-foreground break-words">
                            Submitted by {att.uploadedBy}
                          </p>
                        )}
                        {att.notes && (
                          <p className="mt-1 text-xs text-muted-foreground break-words">
                            {att.notes}
                          </p>
                        )}
                        {/* Review state */}
                        {att.reviewStatus === "PENDING" && (
                          <Badge className="mt-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Pending review
                          </Badge>
                        )}
                        {att.reviewStatus === "APPROVED" && att.isCurrent && (
                          <Badge className="mt-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            Approved
                          </Badge>
                        )}
                        {att.reviewStatus === "REJECTED" && (
                          <p className="mt-1 text-xs text-destructive break-words">
                            Rejected{att.rejectionReason ? `: ${att.rejectionReason}` : ""}
                          </p>
                        )}
                        {/* Inline reject reason */}
                        {canReview && rejectingId === att.id && (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason (optional)"
                              className="h-8"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && handleReject(att.id)}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={rejecting}
                              onClick={() => handleReject(att.id)}
                            >
                              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {/* Approve / reject for pending assignee submissions */}
                        {canReview && att.reviewStatus === "PENDING" && rejectingId !== att.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Approve"
                              disabled={approving}
                              onClick={() => handleApprove(att.id)}
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Reject"
                              onClick={() => {
                                setRejectingId(att.id);
                                setRejectReason("");
                              }}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(att.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
