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
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetRegistrationComplianceViewQuery,
  useGenerateRegistrationComplianceDocumentsMutation,
  useCreateRegistrationComplianceDocumentMutation,
  useUpdateRegistrationComplianceDocumentMutation,
  useDeleteRegistrationComplianceDocumentMutation,
  type ComplianceDocumentApi,
  type ComplianceDocumentBody,
} from "@/store/api/complianceDocuments";
import { ComplianceDocumentsTable } from "./ComplianceDocumentsTable";
import { ComplianceCompletenessBar } from "./ComplianceCompletenessBar";
import { ComplianceDocumentDialog } from "./ComplianceDocumentDialog";
import { GenerateComplianceDialog } from "./GenerateComplianceDialog";
import { HandoverReadinessCard } from "./HandoverReadinessCard";

interface RegistrationComplianceTabProps {
  registrationId: string;
  readOnly?: boolean;
}

export const RegistrationComplianceTab = ({
  registrationId,
  readOnly = false,
}: RegistrationComplianceTabProps) => {
  const { toast } = useToast();
  const { data: viewResponse, isLoading } = useGetRegistrationComplianceViewQuery({
    registrationId,
  });

  const [generate, { isLoading: generating }] =
    useGenerateRegistrationComplianceDocumentsMutation();
  const [createDoc, { isLoading: creating }] = useCreateRegistrationComplianceDocumentMutation();
  const [updateDoc, { isLoading: updating }] = useUpdateRegistrationComplianceDocumentMutation();
  const [deleteDoc] = useDeleteRegistrationComplianceDocumentMutation();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ComplianceDocumentApi | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<ComplianceDocumentApi | null>(null);

  const view = viewResponse?.data;
  const projectDocuments = view?.projectDocuments ?? [];
  const registrationDocuments = view?.registrationDocuments ?? [];
  const completeness = view?.completeness;
  const projectId = view?.projectId ?? "";

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
        await updateDoc({ registrationId, id: editingDoc.id, body }).unwrap();
        toast({ title: "Document updated" });
      } else {
        await createDoc({ registrationId, body }).unwrap();
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
        registrationId,
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
      await deleteDoc({ registrationId, id: deletingDoc.id }).unwrap();
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Couldn't remove document", variant: "destructive" });
    } finally {
      setDeletingDoc(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HandoverReadinessCard registrationId={registrationId} />

      {completeness && (
        <ComplianceCompletenessBar
          completeness={completeness}
          label="Combined compliance completeness"
        />
      )}

      {/* Inherited project-level documents (read-only) */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Inherited from project</h3>
          <p className="text-sm text-muted-foreground">
            Project-level documents apply to this dwelling. Manage them on the project.
          </p>
        </div>
        <ComplianceDocumentsTable
          documents={projectDocuments}
          ownerType="PROJECT"
          ownerId={projectId}
          readOnly
          emptyMessage="No project-level documents."
        />
      </div>

      {/* Registration-specific documents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">This dwelling</h3>
            <p className="text-sm text-muted-foreground">
              Documents specific to this registration.
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add document
              </Button>
            </div>
          )}
        </div>
        <ComplianceDocumentsTable
          documents={registrationDocuments}
          ownerType="REGISTRATION"
          ownerId={registrationId}
          readOnly={readOnly}
          onEdit={openEdit}
          onDelete={(doc) => setDeletingDoc(doc)}
          onStatusChange={handleStatusChange}
          emptyMessage="No dwelling-specific documents yet."
        />
      </div>

      <GenerateComplianceDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        isLoading={generating}
        onGenerate={(prompt) => generate({ registrationId, prompt }).unwrap()}
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

      <AlertDialog open={!!deletingDoc} onOpenChange={(next) => !next && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove compliance document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingDoc?.documentName}" and its attachments will be removed from this
              registration. This cannot be undone.
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
