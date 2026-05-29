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
import { Loader2, Plus, RotateCcw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetProjectComplianceDocumentsQuery,
  useGetProjectComplianceCompletenessQuery,
  useGenerateProjectComplianceDocumentsMutation,
  useCreateProjectComplianceDocumentMutation,
  useUpdateProjectComplianceDocumentMutation,
  useDeleteProjectComplianceDocumentMutation,
  useResetProjectComplianceDocumentsMutation,
  type ComplianceDocumentApi,
  type ComplianceDocumentBody,
} from "@/store/api/complianceDocuments";
import { ComplianceDocumentsTable } from "./ComplianceDocumentsTable";
import { ComplianceCompletenessBar } from "./ComplianceCompletenessBar";
import { ComplianceDocumentDialog } from "./ComplianceDocumentDialog";
import { GenerateComplianceDialog } from "./GenerateComplianceDialog";

interface ProjectComplianceSectionProps {
  projectId: string;
}

export const ProjectComplianceSection = ({ projectId }: ProjectComplianceSectionProps) => {
  const { toast } = useToast();
  const { data: docsResponse, isLoading } = useGetProjectComplianceDocumentsQuery({ projectId });
  const { data: completenessResponse } = useGetProjectComplianceCompletenessQuery({ projectId });

  const [generate, { isLoading: generating }] = useGenerateProjectComplianceDocumentsMutation();
  const [createDoc, { isLoading: creating }] = useCreateProjectComplianceDocumentMutation();
  const [updateDoc, { isLoading: updating }] = useUpdateProjectComplianceDocumentMutation();
  const [deleteDoc] = useDeleteProjectComplianceDocumentMutation();
  const [resetDocs, { isLoading: resetting }] = useResetProjectComplianceDocumentsMutation();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ComplianceDocumentApi | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<ComplianceDocumentApi | null>(null);
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
        </div>
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
            Generate with AI
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add document
          </Button>
        </div>
      </div>

      {completeness && <ComplianceCompletenessBar completeness={completeness} />}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ComplianceDocumentsTable
          documents={documents}
          ownerType="PROJECT"
          ownerId={projectId}
          onEdit={openEdit}
          onDelete={(doc) => setDeletingDoc(doc)}
          onStatusChange={handleStatusChange}
          emptyMessage="No compliance documents yet. Generate the list with AI or add one manually."
        />
      )}

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
