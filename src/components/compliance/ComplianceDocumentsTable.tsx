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
import { Checkbox } from "@/components/ui/checkbox";
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
  /**
   * Developer/Builder Decoupling PRD (Req 5). When true the viewer is a delegated
   * (scoped) builder, so DEVELOPER-responsible statutory documents render
   * read-only even though the rest of the worklist is editable.
   */
  scopedBuilder?: boolean;
  onEdit?: (doc: ComplianceDocumentApi) => void;
  onDelete?: (doc: ComplianceDocumentApi) => void;
  onAssign?: (doc: ComplianceDocumentApi) => void;
  onStatusChange?: (doc: ComplianceDocumentApi, status: string) => void;
  emptyMessage?: string;
  /**
   * Change #2 (opt-in): show a leading checkbox so several documents can be
   * selected and shared together. Only enabled by the project Compliance tab;
   * other usages omit these and render exactly as before.
   */
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (doc: ComplianceDocumentApi) => void;
}

export const ComplianceDocumentsTable = ({
  documents,
  ownerType,
  ownerId,
  readOnly = false,
  scopedBuilder = false,
  onEdit,
  onDelete,
  onAssign,
  onStatusChange,
  emptyMessage = "No compliance documents yet.",
  selectable = false,
  selectedIds = [],
  onToggleSelect,
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
              {selectable && <TableHead className="w-[40px]" />}
              <TableHead>Document</TableHead>
              <TableHead className="w-[130px]">Requirement</TableHead>
              <TableHead className="w-[170px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const party = (doc.responsibleParty ?? "").toUpperCase();
              // A scoped builder may not edit developer-supplied statutory docs.
              const rowReadOnly =
                readOnly || (scopedBuilder && party === "DEVELOPER");
              const selected = selectedIds.includes(doc.id);
              return (
              <TableRow key={doc.id} data-state={selected ? "selected" : undefined}>
                {selectable && (
                  <TableCell className="align-top pt-4">
                    {!rowReadOnly && onToggleSelect ? (
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggleSelect(doc)}
                        aria-label={`Select ${doc.documentName}`}
                      />
                    ) : null}
                  </TableCell>
                )}
                <TableCell>
                  <div className="font-medium flex items-center gap-2">
                    {doc.documentName}
                    {party && (
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-wide"
                        title={
                          party === "DEVELOPER"
                            ? "Developer-supplied statutory document"
                            : party === "TRADE"
                            ? "Trade-issued certificate"
                            : "Builder-collated certificate"
                        }
                      >
                        {party === "DEVELOPER"
                          ? scopedBuilder
                            ? "Developer · read-only"
                            : "Developer"
                          : party === "TRADE"
                          ? "Trade"
                          : "Builder"}
                      </Badge>
                    )}
                  </div>
                  {doc.category && (
                    <div className="text-xs text-muted-foreground">{doc.category}</div>
                  )}
                  {doc.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {doc.description}
                    </div>
                  )}
                  {doc.assigneeLabel && (
                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        className="gap-1 font-normal text-[11px]"
                        title={`Assigned to ${doc.assigneeLabel}`}
                      >
                        <UserPlus className="h-3 w-3" />
                        Assigned to {doc.assigneeLabel}
                      </Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={mandatoryBadgeClass(doc.mandatory)}>
                    {mandatoryLabel(doc.mandatory)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {rowReadOnly || !onStatusChange ? (
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
                    {!rowReadOnly && onAssign
                      && (doc.status ?? "").toUpperCase() !== "RECEIVED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={doc.assigneeLabel
                          ? `Reassign (currently ${doc.assigneeLabel})`
                          : "Assign to someone to provide"}
                        onClick={() => onAssign(doc)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    {!rowReadOnly && onEdit && (
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
                    {!rowReadOnly && onDelete && (
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
              );
            })}
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
          readOnly={
            readOnly ||
            (scopedBuilder &&
              (attachmentDoc.responsibleParty ?? "").toUpperCase() === "DEVELOPER")
          }
        />
      )}
    </>
  );
};
