import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, RotateCcw, Sparkles, Upload, Home, UserPlus, Send, X, FolderUp, ClipboardCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useUploadDocumentsFolderMutation,
  useLazyGetProjectDocumentsCheckQuery,
  type ComplianceCheckResult,
} from "@/store/api/projectDocuments";
import {
  useGetProjectComplianceDocumentsQuery,
  useGetProjectComplianceCompletenessQuery,
  useGenerateProjectComplianceDocumentsMutation,
  useCreateProjectComplianceDocumentMutation,
  useUpdateProjectComplianceDocumentMutation,
  useDeleteProjectComplianceDocumentMutation,
  useResetProjectComplianceDocumentsMutation,
  useAssignProjectComplianceDocumentMutation,
  useAssignProjectRegistrationDocTypeMutation,
  useShareComplianceBatchMutation,
  useGetProjectRegistrationDocTypesQuery,
  type BatchItemSpecApi,
  type ComplianceAssignBody,
  type ComplianceDocumentApi,
  type ComplianceDocumentBody,
} from "@/store/api/complianceDocuments";
import { PerUnitUploadDialog } from "./PerUnitUploadDialog";
import { Badge } from "@/components/ui/badge";
import { ComplianceDocumentsTable } from "./ComplianceDocumentsTable";
import { ComplianceCompletenessBar } from "./ComplianceCompletenessBar";
import { ComplianceDocumentDialog } from "./ComplianceDocumentDialog";
import { AssignComplianceDialog } from "./AssignComplianceDialog";
import { GenerateComplianceDialog, type ComplianceFeatureFlags } from "./GenerateComplianceDialog";

interface ProjectComplianceSectionProps {
  projectId: string;
  /** Developer/Builder Decoupling: "OPERATOR" or "SCOPED_BUILDER" for the caller. */
  accessRole?: string;
  /** Developer/Builder Decoupling: NSW reference version this checklist was generated against. */
  matrixReferenceVersion?: string | null;
  jurisdiction?: string | null;
  /** The project's saved features — pre-tick the Generate dialog's toggles. */
  initialFeatures?: ComplianceFeatureFlags;
}

/** Advisory result of the assessment-only compliance check (generates nothing). */
const ComplianceCheckCard = ({ result }: { result: ComplianceCheckResult }) => {
  const ok = result.readyForHandover;
  return (
    <div className={`rounded-md border p-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-center gap-2 font-medium">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
        {ok
          ? "All required documents appear to be present"
          : `${result.missing.length} required document(s) still needed`}
      </div>
      {!ok && result.missing.length > 0 && (
        <ul className="mt-1.5 ml-6 list-disc text-muted-foreground">
          {result.missing.map((m, i) => <li key={i}>{m.documentName}</li>)}
        </ul>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        Assessment only — this does not generate or change any documents. {result.uploadedCount} uploaded.
      </p>
    </div>
  );
};

export const ProjectComplianceSection = ({
  projectId,
  accessRole,
  matrixReferenceVersion,
  jurisdiction,
  initialFeatures,
}: ProjectComplianceSectionProps) => {
  const isScopedBuilder = accessRole === "SCOPED_BUILDER";
  const { toast } = useToast();
  const { data: docsResponse, isLoading } = useGetProjectComplianceDocumentsQuery({ projectId });
  const { data: completenessResponse } = useGetProjectComplianceCompletenessQuery({ projectId });
  // D3: per-unit (registration-scope) document types shown as a separate group.
  const { data: perUnitResponse } = useGetProjectRegistrationDocTypesQuery(projectId);
  const perUnitDocs = perUnitResponse?.data ?? [];
  const [perUnitDoc, setPerUnitDoc] = useState<{ documentName: string; category: string | null } | null>(null);
  const [assigningPerUnit, setAssigningPerUnit] = useState<{
    documentName: string;
    category: string | null;
    unitsTotal: number;
    reassign?: boolean;
  } | null>(null);

  const [generate, { isLoading: generating }] = useGenerateProjectComplianceDocumentsMutation();
  const [createDoc, { isLoading: creating }] = useCreateProjectComplianceDocumentMutation();
  const [updateDoc, { isLoading: updating }] = useUpdateProjectComplianceDocumentMutation();
  const [deleteDoc] = useDeleteProjectComplianceDocumentMutation();
  const [resetDocs, { isLoading: resetting }] = useResetProjectComplianceDocumentsMutation();
  const [assignDoc, { isLoading: assigning }] = useAssignProjectComplianceDocumentMutation();
  const [assignPerUnitDoc, { isLoading: assigningPerUnitDoc }] =
    useAssignProjectRegistrationDocTypeMutation();
  const [shareBatch, { isLoading: sharing }] = useShareComplianceBatchMutation();
  const [uploadFolder, { isLoading: uploadingFolder }] = useUploadDocumentsFolderMutation();
  const [runCheck, { data: checkResult, isFetching: checking }] = useLazyGetProjectDocumentsCheckQuery();

  const onFolder = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const all = Array.from(fileList) as (File & { webkitRelativePath?: string })[];
    const files = all.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (files.length === 0) {
      toast({ title: "No PDFs found in that folder", variant: "destructive" });
      return;
    }
    const relativePaths = files.map((f) => f.webkitRelativePath || f.name);
    try {
      const res = await uploadFolder({ projectId, files, relativePaths }).unwrap();
      const data = res?.data;
      toast({
        title: res?.message || `Processed ${files.length} document(s)`,
        description: data?.unmatched?.length ? `${data.unmatched.length} file(s) didn't match a row.` : undefined,
      });
    } catch {
      toast({ title: "Folder upload failed", description: "Please try again.", variant: "destructive" });
    }
  };

  // Change #2: multi-select several documents (project-level + per-unit types)
  // to share with one recipient in a single request.
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedPerUnit, setSelectedPerUnit] = useState<string[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const selectedCount = selectedProjectIds.length + selectedPerUnit.length;

  const toggleProject = (doc: ComplianceDocumentApi) =>
    setSelectedProjectIds((prev) =>
      prev.includes(doc.id) ? prev.filter((x) => x !== doc.id) : [...prev, doc.id]
    );
  const togglePerUnit = (documentName: string) =>
    setSelectedPerUnit((prev) =>
      prev.includes(documentName)
        ? prev.filter((x) => x !== documentName)
        : [...prev, documentName]
    );
  const clearSelection = () => {
    setSelectedProjectIds([]);
    setSelectedPerUnit([]);
  };

  const handleShareBatch = async (body: ComplianceAssignBody) => {
    const items: BatchItemSpecApi[] = [
      ...selectedProjectIds.map((id) => ({ tier: "PROJECT" as const, documentId: id })),
      ...selectedPerUnit.map((name) => {
        const d = perUnitDocs.find((p) => p.documentName === name);
        return {
          tier: "REGISTRATION_TYPE" as const,
          documentName: name,
          category: d?.category ?? null,
        };
      }),
    ];
    if (items.length === 0) return;
    try {
      const res = await shareBatch({ projectId, items, body }).unwrap();
      toast({
        title: "Documents shared",
        description:
          res?.message ??
          "The recipient was sent one link to upload everything you selected.",
      });
      setShareOpen(false);
      clearSelection();
    } catch {
      toast({ title: "Couldn't share documents", variant: "destructive" });
    }
  };

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ComplianceDocumentApi | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<ComplianceDocumentApi | null>(null);
  const [assigningDoc, setAssigningDoc] = useState<ComplianceDocumentApi | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const documents = docsResponse?.data ?? [];
  const completeness = completenessResponse?.data;

  const openCreate = () => {
    setEditingDoc(null);
    setEditorOpen(true);
  };

  const openEdit = (doc: ComplianceDocumentApi) => {
    setEditingDoc(doc);
    setEditorOpen(true);
  };

  const handleSave = async (body: ComplianceDocumentBody) => {
    try {
      if (editingDoc) {
        await updateDoc({ projectId, id: editingDoc.id, body }).unwrap();
        toast({ title: "Document updated" });
      } else {
        await createDoc({ projectId, body }).unwrap();
        toast({ title: "Document added" });
      }
      setEditorOpen(false);
      setEditingDoc(null);
    } catch {
      toast({ title: "Couldn't save document", variant: "destructive" });
    }
  };

  const handleStatusChange = async (doc: ComplianceDocumentApi, status: string) => {
    try {
      await updateDoc({
        projectId,
        id: doc.id,
        body: {
          documentName: doc.documentName,
          category: doc.category,
          description: doc.description,
          mandatory: doc.mandatory,
          issuer: doc.issuer,
          appliesTo: doc.appliesTo,
          notes: doc.notes,
          orderIndex: doc.orderIndex,
          status,
        },
      }).unwrap();
    } catch {
      toast({ title: "Couldn't update status", variant: "destructive" });
    }
  };

  const handleAssign = async (body: ComplianceAssignBody) => {
    if (!assigningDoc) return;
    try {
      const wasAssigned = !!assigningDoc.assigneeLabel;
      await assignDoc({ projectId, id: assigningDoc.id, body }).unwrap();
      toast({
        title: wasAssigned ? "Reassigned" : "Assigned",
        description: wasAssigned
          ? "The new party was invited; the previous assignee can no longer act."
          : "The trade/auditor was invited. Their certificate will close this line automatically.",
      });
      setAssigningDoc(null);
    } catch {
      toast({ title: "Couldn't assign document", variant: "destructive" });
    }
  };

  const handleAssignPerUnit = async (body: ComplianceAssignBody) => {
    if (!assigningPerUnit) return;
    try {
      const res = await assignPerUnitDoc({
        projectId,
        documentName: assigningPerUnit.documentName,
        category: assigningPerUnit.category,
        body,
      }).unwrap();
      toast({
        title: assigningPerUnit.reassign ? "Reassigned across units" : "Assigned to all units",
        description:
          res?.message ??
          "The trade/vendor was invited to upload one document per unit. Any previous assignee can no longer act.",
      });
      setAssigningPerUnit(null);
    } catch {
      toast({ title: "Couldn't assign document", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    try {
      await deleteDoc({ projectId, id: deletingDoc.id }).unwrap();
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Couldn't remove document", variant: "destructive" });
    } finally {
      setDeletingDoc(null);
    }
  };

  const handleReset = async () => {
    try {
      await resetDocs({ projectId }).unwrap();
      const result = await generate({ projectId }).unwrap();
      if (!result.success) {
        toast({
          title: "Checklist cleared",
          description: result.message || "Couldn't regenerate the default checklist. Generate it manually.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Reset to default checklist" });
      }
    } catch {
      toast({ title: "Couldn't reset documents", variant: "destructive" });
    } finally {
      setResetOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Compliance documents</h3>
          <p className="text-sm text-muted-foreground">
            Project-level documents. These are inherited by every registration in this project.
          </p>
          {matrixReferenceVersion && (
            <p className="text-xs text-muted-foreground mt-1">
              Generated from {jurisdiction ?? "NSW"} compliance reference{" "}
              <span className="font-mono">{matrixReferenceVersion}</span>
            </p>
          )}
        </div>
        {/* Generating, resetting and adding statutory documents are operator
            (developer) actions; a delegated builder works the resulting list. */}
        {!isScopedBuilder && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={() => runCheck({ projectId })} disabled={checking}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              {checking ? "Checking…" : "Run compliance check"}
            </Button>
            <input
              id="project-compliance-folder"
              type="file"
              multiple
              className="hidden"
              ref={(el) => {
                if (el) {
                  el.setAttribute("webkitdirectory", "");
                  el.setAttribute("directory", "");
                }
              }}
              onChange={(e) => {
                onFolder(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("project-compliance-folder")?.click()}
              disabled={uploadingFolder}
            >
              <FolderUp className="h-4 w-4 mr-2" />
              {uploadingFolder ? "Uploading…" : "Upload folder"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setResetOpen(true)}
              disabled={resetting || generating || documents.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to default
            </Button>
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add document
            </Button>
          </div>
        )}
      </div>

      {checkResult?.data && <ComplianceCheckCard result={checkResult.data} />}

      {completeness && <ComplianceCompletenessBar completeness={completeness} />}

      {selectedCount > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 shadow-sm">
          <span className="text-sm font-medium">
            {selectedCount} document{selectedCount === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1.5" />
              Clear
            </Button>
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Send className="h-4 w-4 mr-1.5" />
              Share selected
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <h4 className="mb-2 text-sm font-semibold">Project documents</h4>
          <ComplianceDocumentsTable
            documents={documents}
            ownerType="PROJECT"
            ownerId={projectId}
            scopedBuilder={isScopedBuilder}
            onEdit={openEdit}
            onDelete={(doc) => setDeletingDoc(doc)}
            onAssign={(doc) => setAssigningDoc(doc)}
            onStatusChange={handleStatusChange}
            emptyMessage="No project-level compliance documents yet. Generate the list or add one manually."
            selectable
            selectedIds={selectedProjectIds}
            onToggleSelect={toggleProject}
          />

          {/* D3: per-unit (registration-scope) document types — one upload modal per unit. */}
          {perUnitDocs.length > 0 && (
            <div className="mt-8">
              <h4 className="mb-1 text-sm font-semibold">Per-unit documents</h4>
              <p className="mb-2 text-xs text-muted-foreground">
                These apply to each unit. Click upload to choose which unit a document belongs to.
              </p>
              <div className="rounded-lg border border-border overflow-hidden divide-y">
                {perUnitDocs.map((d) => (
                  <div key={d.documentName} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Checkbox
                        className="mt-0.5"
                        checked={selectedPerUnit.includes(d.documentName)}
                        onCheckedChange={() => togglePerUnit(d.documentName)}
                        aria-label={`Select ${d.documentName}`}
                      />
                      <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{d.documentName}</span>
                        {d.responsibleParty && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {d.responsibleParty}
                          </Badge>
                        )}
                      </div>
                      {d.category && (
                        <div className="ml-6 text-xs text-muted-foreground">{d.category}</div>
                      )}
                      {d.assigneeLabel && (
                        <div className="ml-6 mt-1">
                          <Badge variant="secondary" className="gap-1 font-normal text-[11px]">
                            <UserPlus className="h-3 w-3" />
                            Assigned to {d.assigneeLabel}
                            {d.assignedUnits ? ` · ${d.assignedUnits}/${d.unitsTotal} units` : ""}
                          </Badge>
                        </div>
                      )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {d.unitsReceived}/{d.unitsTotal} units
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        title={d.assigneeLabel
                          ? `Reassign (currently ${d.assigneeLabel})`
                          : "Assign to a trade/vendor for every unit"}
                        onClick={() =>
                          setAssigningPerUnit({
                            documentName: d.documentName,
                            category: d.category,
                            unitsTotal: d.unitsTotal,
                            reassign: !!d.assigneeLabel,
                          })
                        }
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {d.assigneeLabel ? "Reassign" : "Assign"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPerUnitDoc({ documentName: d.documentName, category: d.category })}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {perUnitDoc && (
        <PerUnitUploadDialog
          open={!!perUnitDoc}
          onOpenChange={(o) => !o && setPerUnitDoc(null)}
          projectId={projectId}
          documentName={perUnitDoc.documentName}
          category={perUnitDoc.category}
        />
      )}

      <AssignComplianceDialog
        open={!!assigningDoc}
        onOpenChange={(next) => !next && setAssigningDoc(null)}
        document={assigningDoc}
        isSaving={assigning}
        onAssign={handleAssign}
      />

      <AssignComplianceDialog
        open={!!assigningPerUnit}
        onOpenChange={(next) => !next && setAssigningPerUnit(null)}
        document={null}
        documentLabel={assigningPerUnit?.documentName}
        helperNote={
          assigningPerUnit
            ? `This is a per-unit document. It will be assigned across all ${assigningPerUnit.unitsTotal} unit${
                assigningPerUnit.unitsTotal === 1 ? "" : "s"
              } — the trade/vendor uploads one document for each.`
            : undefined
        }
        isSaving={assigningPerUnitDoc}
        onAssign={handleAssignPerUnit}
      />

      <AssignComplianceDialog
        open={shareOpen}
        onOpenChange={(next) => !next && setShareOpen(false)}
        document={null}
        documentLabel={`${selectedCount} document${selectedCount === 1 ? "" : "s"}`}
        helperNote={
          selectedPerUnit.length > 0
            ? "Selected documents will be requested together in ONE email with ONE upload link. Per-unit documents are requested for every unit."
            : "Selected documents will be requested together in ONE email with ONE upload link."
        }
        isSaving={sharing}
        onAssign={handleShareBatch}
      />

      <GenerateComplianceDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        isLoading={generating}
        initialFeatures={initialFeatures}
        onGenerate={(prompt, features) => generate({ projectId, prompt, ...features }).unwrap()}
      />

      <ComplianceDocumentDialog
        open={editorOpen}
        onOpenChange={(next) => {
          setEditorOpen(next);
          if (!next) setEditingDoc(null);
        }}
        document={editingDoc}
        isSaving={creating || updating}
        onSave={handleSave}
      />

      <AlertDialog open={resetOpen} onOpenChange={(next) => !resetting && setResetOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to default checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the current project compliance documents and regenerates the standard
              checklist. Any manual edits, custom documents, and statuses on this project will be
              lost. Attachments on removed documents will no longer be linked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset to default"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingDoc}
        onOpenChange={(next) => !next && setDeletingDoc(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove compliance document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingDoc?.documentName}" and its attachments will be removed from this
              project. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
