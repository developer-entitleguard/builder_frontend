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
import { Loader2, Plus, RotateCcw, Sparkles, Upload, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetProjectComplianceDocumentsQuery,
  useGetProjectComplianceCompletenessQuery,
  useGenerateProjectComplianceDocumentsMutation,
  useCreateProjectComplianceDocumentMutation,
  useUpdateProjectComplianceDocumentMutation,
  useDeleteProjectComplianceDocumentMutation,
  useResetProjectComplianceDocumentsMutation,
  useAssignProjectComplianceDocumentMutation,
  useGetProjectRegistrationDocTypesQuery,
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
import { GenerateComplianceDialog } from "./GenerateComplianceDialog";

interface ProjectComplianceSectionProps {
  projectId: string;
  /** Developer/Builder Decoupling: "OPERATOR" or "SCOPED_BUILDER" for the caller. */
  accessRole?: string;
  /** Developer/Builder Decoupling: NSW reference version this checklist was generated against. */
  matrixReferenceVersion?: string | null;
  jurisdiction?: string | null;
}

export const ProjectComplianceSection = ({
  projectId,
  accessRole,
  matrixReferenceVersion,
  jurisdiction,
}: ProjectComplianceSectionProps) => {
  const isScopedBuilder = accessRole === "SCOPED_BUILDER";
  const { toast } = useToast();
  const { data: docsResponse, isLoading } = useGetProjectComplianceDocumentsQuery({ projectId });
  const { data: completenessResponse } = useGetProjectComplianceCompletenessQuery({ projectId });
  // D3: per-unit (registration-scope) document types shown as a separate group.
  const { data: perUnitResponse } = useGetProjectRegistrationDocTypesQuery(projectId);
  const perUnitDocs = perUnitResponse?.data ?? [];
  const [perUnitDoc, setPerUnitDoc] = useState<{ documentName: string; category: string | null } | null>(null);

  const [generate, { isLoading: generating }] = useGenerateProjectComplianceDocumentsMutation();
  const [createDoc, { isLoading: creating }] = useCreateProjectComplianceDocumentMutation();
  const [updateDoc, { isLoading: updating }] = useUpdateProjectComplianceDocumentMutation();
  const [deleteDoc] = useDeleteProjectComplianceDocumentMutation();
  const [resetDocs, { isLoading: resetting }] = useResetProjectComplianceDocumentsMutation();
  const [assignDoc, { isLoading: assigning }] = useAssignProjectComplianceDocumentMutation();

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
      await assignDoc({ projectId, id: assigningDoc.id, body }).unwrap();
      toast({
        title: "Assigned",
        description:
          "The trade/auditor was invited. Their certificate will close this line automatically.",
      });
      setAssigningDoc(null);
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
          <div className="flex items-center gap-2">
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

      {completeness && <ComplianceCompletenessBar completeness={completeness} />}

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
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {d.unitsReceived}/{d.unitsTotal} units
                      </span>
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

      <GenerateComplianceDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        isLoading={generating}
        onGenerate={(prompt) => generate({ projectId, prompt }).unwrap()}
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
