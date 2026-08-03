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
  FileText,
  FolderUp,
  Loader2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ComplianceCompletenessBar } from "@/components/compliance/ComplianceCompletenessBar";
import {
  useGetProjectDocumentsQuery,
  useLazyGetProjectDocumentsCheckQuery,
  useUploadDocumentsFolderMutation,
  useUploadManualsFolderMutation,
} from "@/store/api/projectDocuments";

/**
 * Project + Compliance (Lite) — the simplified "Documents" tab for
 * self-sufficient builder/developer orgs, shown in place of the full Compliance
 * tab. Drop a folder of PDFs → they're classified and matched into the
 * compliance checklist; run a compliance check; drop a folder of product
 * manuals → they become the project's BOM. Everything flows to the customer at
 * handover.
 */

interface ProjectDocumentsSectionProps {
  projectId: string;
}

/** Keep only PDFs from a picked folder; return files + their webkit relative paths. */
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

const statusVariant = (status: string | null): "default" | "secondary" | "outline" => {
  if (status === "RECEIVED") return "default";
  if (status === "REQUIRED") return "secondary";
  return "outline";
};

/** A folder picker rendered as a button; sets the non-standard webkitdirectory attrs via ref. */
const FolderPickerButton = ({
  label,
  icon,
  busy,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
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
            // webkitdirectory / directory aren't typed on HTMLInputElement.
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
          e.target.value = ""; // allow re-picking the same folder
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="mr-2">{icon}</span>}
        {label}
      </Button>
    </>
  );
};

export const ProjectDocumentsSection = ({ projectId }: ProjectDocumentsSectionProps) => {
  const { toast } = useToast();

  const { data: docsResp, isLoading } = useGetProjectDocumentsQuery({ projectId });
  const [uploadDocs, docsUploadState] = useUploadDocumentsFolderMutation();
  const [uploadManuals, manualsUploadState] = useUploadManualsFolderMutation();
  const [runCheck, checkState] = useLazyGetProjectDocumentsCheckQuery();

  const documents = docsResp?.data ?? [];
  const lastDocsUpload = docsUploadState.data?.data;
  const lastManualsUpload = manualsUploadState.data?.data;
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

  const handleManualsFolder = async (fileList: FileList | null) => {
    const { pdfs, relativePaths, skipped } = collectPdfs(fileList);
    if (pdfs.length === 0) {
      toast({
        title: "No PDFs found",
        description: "Pick a folder that contains PDF manuals.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await uploadManuals({ projectId, files: pdfs, relativePaths }).unwrap();
      const d = res.data;
      toast({
        title: res.message || "Manuals imported",
        description: `${d.created.length} manual(s) added to the BOM${
          d.skipped.length ? `, ${d.skipped.length} skipped` : ""
        }${skipped ? `, ${skipped} non-PDF ignored` : ""}.`,
      });
    } catch {
      toast({
        title: "Import failed",
        description: "Something went wrong importing the manuals folder.",
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
      {/* Intake */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload a folder of PDFs (base or nested) — each document is read, classified and
            matched into the compliance checklist. Upload a folder of product manuals to build the
            BOM. Everything is sent to the homeowner at handover.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <FolderPickerButton
            label="Upload documents folder"
            icon={<FolderUp className="h-4 w-4" />}
            busy={docsUploadState.isLoading}
            onPick={handleDocsFolder}
          />
          <FolderPickerButton
            label="Upload manuals folder (BOM)"
            icon={<Wrench className="h-4 w-4" />}
            busy={manualsUploadState.isLoading}
            onPick={handleManualsFolder}
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

      {/* Last upload feedback */}
      {(lastDocsUpload?.unmatched?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            {lastDocsUpload!.unmatched.length} file(s) couldn&apos;t be stored
          </div>
          <p className="text-amber-700">
            {lastDocsUpload!.unmatched.join(", ")}
          </p>
          <p className="mt-1 text-amber-700">
            Please retry these files. Everything else was filed — documents that didn&apos;t match a
            checklist item were added as their own rows below.
          </p>
        </div>
      )}
      {(lastManualsUpload?.skipped?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
          {lastManualsUpload!.skipped.length} manual(s) were skipped: {lastManualsUpload!.skipped.join(", ")}
        </div>
      )}

      {/* Compliance check result */}
      {check && (
        <div className="space-y-3">
          <ComplianceCompletenessBar completeness={check.completeness} label="Compliance check" />
          {check.outstandingRequired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Still missing</CardTitle>
                <CardDescription>
                  These required documents haven&apos;t been provided yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {check.outstandingRequired.map((o) => (
                    <li key={o.documentId} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>{o.documentName}</span>
                      {o.category && (
                        <span className="text-muted-foreground">({o.category})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Current documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document checklist</CardTitle>
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
                  <TableHead>Requirement</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.documentName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.mandatory ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(doc.status)}>{doc.status ?? "—"}</Badge>
                    </TableCell>
                  </TableRow>
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
