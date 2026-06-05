import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paperclip, Pencil, Trash2, UserPlus } from "lucide-react";
import type { ComplianceDocumentApi } from "@/store/api/complianceDocuments";
import { ComplianceAttachmentsDialog } from "./ComplianceAttachmentsDialog";
import {
  STATUS_OPTIONS,
  mandatoryBadgeClass,
  mandatoryLabel,
  statusBadgeClass,
  statusLabel,
} from "./complianceConstants";

interface ComplianceDocumentsTableProps {
  documents: ComplianceDocumentApi[];
  ownerType: "PROJECT" | "REGISTRATION";
  ownerId: string;
  readOnly?: boolean;
  onEdit?: (doc: ComplianceDocumentApi) => void;
  onDelete?: (doc: ComplianceDocumentApi) => void;
  onAssign?: (doc: ComplianceDocumentApi) => void;
  onStatusChange?: (doc: ComplianceDocumentApi, status: string) => void;
  emptyMessage?: string;
}

export const ComplianceDocumentsTable = ({
  documents,
  ownerType,
  ownerId,
  readOnly = false,
  onEdit,
  onDelete,
  onAssign,
  onStatusChange,
  emptyMessage = "No compliance documents yet.",
}: ComplianceDocumentsTableProps) => {
  const [attachmentDoc, setAttachmentDoc] = useState<ComplianceDocumentApi | null>(null);

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead className="w-[130px]">Requirement</TableHead>
              <TableHead className="w-[170px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="font-medium">{doc.documentName}</div>
                  {doc.category && (
                    <div className="text-xs text-muted-foreground">{doc.category}</div>
                  )}
                  {doc.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {doc.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={mandatoryBadgeClass(doc.mandatory)}>
                    {mandatoryLabel(doc.mandatory)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {readOnly || !onStatusChange ? (
                    <Badge className={statusBadgeClass(doc.status)}>
                      {statusLabel(doc.status)}
                    </Badge>
                  ) : (
                    <Select
                      value={(doc.status ?? "REQUIRED").toUpperCase()}
                      onValueChange={(v) => onStatusChange(doc, v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {statusLabel(opt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Attachments"
                      onClick={() => setAttachmentDoc(doc)}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    {!readOnly &&
                      onAssign &&
                      (doc.status ?? "").toUpperCase() !== "RECEIVED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Assign to trade / auditor"
                          onClick={() => onAssign(doc)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                    {!readOnly && onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Edit"
                        onClick={() => onEdit(doc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {!readOnly && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Delete"
                        onClick={() => onDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {attachmentDoc && (
        <ComplianceAttachmentsDialog
          open={!!attachmentDoc}
          onOpenChange={(next) => !next && setAttachmentDoc(null)}
          ownerType={ownerType}
          ownerId={ownerId}
          documentId={attachmentDoc.id}
          documentName={attachmentDoc.documentName}
          readOnly={readOnly}
        />
      )}
    </>
  );
};
