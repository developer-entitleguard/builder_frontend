import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ListTodo, FileSpreadsheet, Download } from 'lucide-react';
import type { ActivityCategory, CreateCategoryData } from '@/hooks/useActivityCategories';
import { useGetDownloadActivityTemplate } from '@/lib/api/services/templateDownload';
import { useUploadActivitiesCsv } from '@/lib/api/services/activityUpload';
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

export interface ActivityTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentMaxOrder: number;
  onSuccess?: () => void;
  onSingleAdd?: () => void;
  categories?: ActivityCategory[];
  onCreateCategory?: (data: CreateCategoryData) => Promise<ActivityCategory | null>;
}

export const ActivityTypeDialog = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
  onSingleAdd,
  categories = [],
}: ActivityTypeDialogProps) => {
  const { toast } = useToast();
  const { download: downloadTemplate, isLoading: isDownloadingTemplate } = useGetDownloadActivityTemplate();
  const { upload: uploadActivitiesCsv, isLoading: isUploading } = useUploadActivitiesCsv();
  const [selectedType, setSelectedType] = useState<'single' | 'bulk' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const resetState = () => {
    setSelectedType(null);
    setSelectedFile(null);
    setSelectedCategoryId("none");
    setDuplicateConfirmOpen(false);
    setDuplicateCount(0);
  };

  const countDuplicatesFromResponse = (resp: unknown): number => {
    if (!resp || typeof resp !== "object") return 0;
    const anyResp = resp as Record<string, unknown>;
    const direct = anyResp["duplicates"];
    if (Array.isArray(direct)) return direct.length;
    const data = anyResp["data"];
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === "object") {
      const anyData = data as Record<string, unknown>;
      if (
        typeof anyData["duplicateCount"] === "number" &&
        Number.isFinite(anyData["duplicateCount"])
      ) {
        return Number(anyData["duplicateCount"]);
      }
      if (
        typeof anyData["Duplicate"] === "boolean" &&
        anyData["Duplicate"] === true
      ) {
        // If backend only gives a duplicate flag, treat as at least 1 duplicate
        return 1;
      }
      if (Array.isArray(anyData["duplicates"])) return (anyData["duplicates"] as unknown[]).length;
      if (Array.isArray(anyData["duplicateActivities"])) return (anyData["duplicateActivities"] as unknown[]).length;
    }
    return 0;
  };

  const duplicateMessage = useMemo(() => {
    if (!duplicateCount) return "";
    return `You are trying to add activities that already exist. Number of duplicate activities: ${duplicateCount}. Do you want to continue?`;
  }, [duplicateCount]);

  const handleSingleActivity = () => {
    onOpenChange(false);
    resetState();
    onSingleAdd?.();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }
    setSelectedFile(file);
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    const resp = await uploadActivitiesCsv(projectId, selectedFile, false);
    if (!resp) return;

    const dupCount = countDuplicatesFromResponse(resp);
    if (dupCount > 0) {
      setDuplicateCount(dupCount);
      setDuplicateConfirmOpen(true);
      return;
    }

    toast({
      title: "Activities imported",
      description: "CSV file was uploaded successfully.",
    });
    resetState();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleConfirmDuplicateYes = async () => {
    if (!selectedFile) return;
    const resp = await uploadActivitiesCsv(projectId, selectedFile, true);
    if (!resp) return;
    toast({
      title: "Activities imported",
      description: "CSV file was uploaded successfully.",
    });
    setDuplicateConfirmOpen(false);
    resetState();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleBack = () => {
    setSelectedType(null);
    setSelectedFile(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedType === null && "Add Activities"}
            {selectedType === 'bulk' && "Import Activities"}
          </DialogTitle>
          <DialogDescription>
            {selectedType === null && "Choose how you want to add activities to this project"}
            {selectedType === 'bulk' && "Upload a CSV file to import multiple activities"}
          </DialogDescription>
        </DialogHeader>

        {selectedType === null && (
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleSingleActivity}
            >
              <ListTodo className="h-8 w-8" />
              <span className="font-semibold">Single Activity</span>
              <span className="text-xs text-muted-foreground">Add one activity at a time</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => setSelectedType('bulk')}
            >
              <FileSpreadsheet className="h-8 w-8" />
              <span className="font-semibold">Import from CSV</span>
              <span className="text-xs text-muted-foreground">Upload spreadsheet with multiple activities</span>
            </Button>
          </div>
        )}

        {selectedType === 'bulk' && (
          <div className="space-y-4 py-4">
            {categories.length > 0 && (
              <div>
                <Label>Default Category (optional)</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  A "category" column in the CSV will override this for matching rows.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected file: <span className="font-medium">{selectedFile.name}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Required column: <strong>name</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Optional: description, category, completed, priority, due_date, quote, price_paid, vendor_name, vendor_email, vendor_phone
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Completed:</strong> true/false/yes/no
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Priority:</strong> low, medium, high, urgent
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Date format:</strong> YYYY-MM-DD
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-between items-center">
              <Button variant="ghost" size="sm" onClick={downloadTemplate} disabled={isDownloadingTemplate}>
                <Download className="w-4 h-4 mr-2" />
                {isDownloadingTemplate ? "Downloading…" : "Download Template"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleSave} disabled={!selectedFile || isUploading}>
                  {isUploading ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate activities detected</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDuplicateConfirmOpen(false);
                resetState();
                onOpenChange(false);
              }}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDuplicateYes}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
