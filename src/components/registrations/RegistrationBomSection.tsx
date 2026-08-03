import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, FolderUp, Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUploadRegistrationManualsFolderMutation } from "@/store/api/projectDocuments";
import {
  useAssignBomToProjectMutation,
  useCheckExistingCustomerItemMapQuery,
  useGetProjectBomsQuery,
} from "@/store/api/items";

/**
 * Project + Compliance (Lite). A registration's Bill of Materials: the products
 * and their manuals for this dwelling, which flow to the homeowner at handover.
 * The builder can either SELECT an existing project BOM (assign it to this unit)
 * or UPLOAD a folder of manuals — the latter creates items directly on this
 * registration with the manuals attached.
 */

interface Props {
  registrationId: string;
  projectId?: string;
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

export const RegistrationBomSection = ({ registrationId, projectId }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedBom, setSelectedBom] = useState<string>("");

  const { data: itemsResp, isLoading, refetch } = useCheckExistingCustomerItemMapQuery(registrationId, {
    skip: !registrationId,
  });
  const { data: bomsResp } = useGetProjectBomsQuery(projectId ?? "", { skip: !projectId });
  const [uploadManuals, { isLoading: uploading }] = useUploadRegistrationManualsFolderMutation();
  const [assignBom, { isLoading: assigning }] = useAssignBomToProjectMutation();

  const items = itemsResp?.data ?? [];
  const boms = bomsResp?.data ?? [];

  const handleFolder = async (fileList: FileList | null) => {
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
      const res = await uploadManuals({ registrationId, files: pdfs, relativePaths }).unwrap();
      const d = res.data;
      toast({
        title: res.message || "Manuals imported",
        description: `${d.created.length} item(s) added${
          d.skipped.length ? `, ${d.skipped.length} skipped` : ""
        }${skipped ? `, ${skipped} non-PDF ignored` : ""}.`,
      });
      refetch();
    } catch {
      toast({
        title: "Import failed",
        description: "Something went wrong importing the manuals folder.",
        variant: "destructive",
      });
    }
  };

  const handleAssign = async () => {
    if (!projectId || !selectedBom) return;
    try {
      await assignBom({ projectId, billOfMaterialId: selectedBom, customerIds: [registrationId] }).unwrap();
      toast({ title: "BOM assigned to this registration" });
      setSelectedBom("");
      refetch();
    } catch {
      toast({ title: "Assign failed", description: "Could not assign the BOM.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Bill of Materials
        </CardTitle>
        <CardDescription>
          Products &amp; manuals for this dwelling — sent to the homeowner at handover. Select an
          existing BOM, or upload a folder of manuals to create items here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {projectId && (
            <div className="flex items-center gap-2">
              <Select value={selectedBom} onValueChange={setSelectedBom}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select an existing BOM" />
                </SelectTrigger>
                <SelectContent>
                  {boms.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No BOMs yet</div>
                  ) : (
                    boms.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bomName || b.projectName || b.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedBom || assigning}
                onClick={handleAssign}
              >
                {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Assign
              </Button>
            </div>
          )}
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
              handleFolder(e.target.files);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderUp className="mr-2 h-4 w-4" />}
            Upload manuals folder
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading items…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products yet. Assign a BOM or upload manuals above.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{item.name || "Item"}</div>
                  {item.category && (
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  )}
                </div>
                {(item.builderCustomerItemFiles?.length ?? 0) > 0 && (
                  <ul className="mt-2 space-y-1">
                    {item.builderCustomerItemFiles!.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {f.files?.name || f.type}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RegistrationBomSection;
