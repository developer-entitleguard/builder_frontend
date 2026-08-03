import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FolderUp,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetProjectDocumentsQuery,
  useLazyGetProjectDocumentsCheckQuery,
  useUploadDocumentsFolderMutation,
} from "@/store/api/projectDocuments";
import {
  useDeleteProjectComplianceDocumentMutation,
  useUploadComplianceAttachmentMutation,
  type ComplianceDocumentApi,
} from "@/store/api/complianceDocuments";

/**
 * Project + Compliance (Lite) — the "Documents" tab. Uploaded-documents only:
 * there is no auto-generated checklist. Drop a folder of PDFs and each becomes a
 * row you can individually replace or remove. "Run compliance check" is advisory
 * — it computes (nothing stored) what the rulebook still expects and lists what's
 * missing, leaving it to the builder to act. (Product manuals live under each
 * registration's BOM, not here.)
 */

interface ProjectDocumentsSectionProps {
  projectId: string;
}

function collectPdfs(fileList: FileList | null): {
  pdfs: File[];
  relativePaths: string[];
  skipped: number;
} {
  const all = fileList ? Array.from(fileList) : [];
  const pdfs = all.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
  const relativePaths = pdfs.map(
    (f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
  );
  return { pdfs, relativePaths, skipped: all.length - pdfs.length };
}

/** Folder picker rendered as a button; sets the non-standard webkitdirectory attrs via ref. */
const FolderPickerButton = ({
  label,
  busy,
  onPick,
}: {
  label: string;
  busy: boolean;
  onPick: (files: FileList | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <input
        ref={(el) => {
          inputRef.current = el;
          if (el) {
            el.setAttribute("webkitdirectory", "");
            el.setAttribute("directory", "");
          }
        }}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderUp className="mr-2 h-4 w-4" />}
        {label}
      </Button>
    </>
  );
};

const statusVariant = (status: string | null): "default" | "secondary" | "outline" => {
  if (status === "RECEIVED") return "default";
  if (status === "REQUIRED") return "secondary";
  return "outline";
};

/** A single uploaded document with per-row replace / remove actions. */
const DocumentRow = ({
  projectId,
  doc,
  onChanged,
}: {
  projectId: string;
  doc: ComplianceDocumentApi;
  onChanged: () => void;
}) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [replace, { isLoading: replacing }] = useUploadComplianceAttachmentMutation();
  const [remove, { isLoading: removing }] = useDeleteProjectComplianceDocumentMutation();

  const onReplace = async (f: File | undefined) => {
    if (!f) return;
    try {
      await replace({ ownerType: "PROJECT", ownerId: projectId, documentId: doc.id, file: f }).unwrap();
      toast({ title: "Document replaced", description: doc.documentName });
      onChanged();
    } catch {
      toast({ title: "Replace failed", description: doc.documentName, variant: "destructive" });
    }
  };

  const onRemove = async () => {
    if (!window.confirm(`Remove "${doc.documentName}"? This deletes the document and its file.`)) return;
    try {
      await remove({ projectId, id: doc.id }).unwrap();
      toast({ title: "Document removed", description: doc.documentName });
      onChanged();
    } catch {
      toast({ title: "Remove failed", description: doc.documentName, variant: "destructive" });
    }
  };

  return (
    <TableRow>
      <TableCell className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        {doc.documentName}
      </TableCell>
      <TableCell className="text-muted-foreground">{doc.category ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={statusVariant(doc.status)}>{doc.status ?? "—"}</Badge>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            onReplace(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={replacing}
          onClick={() => fileRef.current?.click()}
          title="Replace file"
        >
          {replacing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" disabled={removing} onClick={onRemove} title="Remove document">
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const ProjectDocumentsSection = ({ projectId }: ProjectDocumentsSectionProps) => {
  const { toast } = useToast();

  const { data: docsResp, isLoading, refetch } = useGetProjectDocumentsQuery({ projectId });
  const [uploadDocs, docsUploadState] = useUploadDocumentsFolderMutation();
  const [runCheck, checkState] = useLazyGetProjectDocumentsCheckQuery();

  const documents = docsResp?.data ?? [];
  const lastDocsUpload = docsUploadState.data?.data;
  const check = checkState.data?.data;

  const handleDocsFolder = async (fileList: FileList | null) => {
    const { pdfs, relativePaths, skipped } = collectPdfs(fileList);
    if (pdfs.length === 0) {
      toast({
        title: "No PDFs found",
        description: "Pick a folder that contains PDF documents.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await uploadDocs({ projectId, files: pdfs, relativePaths }).unwrap();
      const d = res.data;
      toast({
        title: res.message || "Upload complete",
        description: `${d.matched.length} document(s) filed${
          d.unmatched.length ? `, ${d.unmatched.length} failed` : ""
        }${skipped ? `, ${skipped} non-PDF skipped` : ""}.`,
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Something went wrong uploading the documents folder.",
        variant: "destructive",
      });
    }
  };

  const handleRunCheck = async () => {
    try {
      await runCheck({ projectId }).unwrap();
    } catch {
      toast({
        title: "Compliance check failed",
        description: "Could not run the compliance check right now.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload a folder of PDFs (base or nested) — each becomes a document you can replace or
            remove below. Run a compliance check any time to see what the rulebook still expects.
            Everything here is sent to the homeowner at handover.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <FolderPickerButton
            label="Upload documents folder"
            busy={docsUploadState.isLoading}
            onPick={handleDocsFolder}
          />
          <Button type="button" onClick={handleRunCheck} disabled={checkState.isFetching}>
            {checkState.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Run compliance check
          </Button>
        </CardContent>
      </Card>

      {(lastDocsUpload?.unmatched?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
          {lastDocsUpload!.unmatched.length} file(s) couldn&apos;t be stored:{" "}
          {lastDocsUpload!.unmatched.join(", ")}. Please retry these files.
        </div>
      )}

      {/* Advisory compliance check result (nothing stored) */}
      {check && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance check</CardTitle>
            <CardDescription>
              {check.rulebookCovered
                ? "Advisory — based on the rulebook for this property. Add whatever applies; it's up to you."
                : "Automated requirements aren't available for this location yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {check.rulebookCovered && check.missing.length === 0 && (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                All {check.required.length} expected document(s) appear to be present.
              </div>
            )}
            {check.missing.length > 0 && (
              <>
                <div className="font-medium text-amber-800">
                  {check.missing.length} document(s) still expected:
                </div>
                <ul className="space-y-1">
                  {check.missing.map((m) => (
                    <li key={m.documentName} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>{m.documentName}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uploaded documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploaded documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents yet. Upload a folder above to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <DocumentRow key={doc.id} projectId={projectId} doc={doc} onChanged={refetch} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDocumentsSection;
