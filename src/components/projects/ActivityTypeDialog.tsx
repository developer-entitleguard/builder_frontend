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

/**
 * The vendor half of an import's dry-run result. The backend resolves every
 * vendor named in the CSV against the organisation's directory (email → phone →
 * name) and creates the ones it can't find — so an import can quietly add a
 * dozen vendor records. This is what lets us show that before it happens.
 */
interface VendorImportSummary {
  vendorsMatched: number;
  vendorsMatchedByEmail: number;
  vendorsMatchedByPhone: number;
  vendorsMatchedByName: number;
  vendorsCreated: number;
  activitiesLinked: number;
  activitiesUnresolved: number;
  warnings: { activity?: string; vendor?: string; warning?: string }[];
}

/** Human wording for the resolver's warning codes. */
const VENDOR_WARNING_LABELS: Record<string, string> = {
  INVALID_PHONE: "phone number isn't a valid Australian format",
  AMBIGUOUS_NAME: "matched on name alone — more than one vendor answers to it",
  DUPLICATE_EMAIL: "more than one vendor in your directory has this email",
};

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
  const [vendorConfirmOpen, setVendorConfirmOpen] = useState(false);
  const [vendorSummary, setVendorSummary] = useState<VendorImportSummary | null>(null);

  const resetState = () => {
    setSelectedType(null);
    setSelectedFile(null);
    setSelectedCategoryId("none");
    setDuplicateConfirmOpen(false);
    setDuplicateCount(0);
    setVendorConfirmOpen(false);
    setVendorSummary(null);
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

  const readVendorSummary = (resp: unknown): VendorImportSummary | null => {
    if (!resp || typeof resp !== "object") return null;
    const data = (resp as Record<string, unknown>)["data"];
    if (!data || typeof data !== "object") return null;
    const raw = (data as Record<string, unknown>)["vendorSummary"];
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Record<string, unknown>;
    const num = (key: string) =>
      typeof s[key] === "number" && Number.isFinite(s[key]) ? Number(s[key]) : 0;
    return {
      vendorsMatched: num("vendorsMatched"),
      vendorsMatchedByEmail: num("vendorsMatchedByEmail"),
      vendorsMatchedByPhone: num("vendorsMatchedByPhone"),
      vendorsMatchedByName: num("vendorsMatchedByName"),
      vendorsCreated: num("vendorsCreated"),
      activitiesLinked: num("activitiesLinked"),
      activitiesUnresolved: num("activitiesUnresolved"),
      warnings: Array.isArray(s["warnings"])
        ? (s["warnings"] as VendorImportSummary["warnings"])
        : [],
    };
  };

  /** Only worth interrupting for when the import would change the directory. */
  const needsVendorConfirmation = (summary: VendorImportSummary | null) =>
    !!summary && (summary.vendorsCreated > 0 || vendorWarnings(summary).length > 0);

  /** ENRICHED is an improvement, not something to warn about. */
  const vendorWarnings = (summary: VendorImportSummary) =>
    summary.warnings.filter((w) => w.warning && w.warning !== "ENRICHED");

  const vendorMatchBreakdown = (summary: VendorImportSummary) => {
    const parts: string[] = [];
    if (summary.vendorsMatchedByEmail) parts.push(`${summary.vendorsMatchedByEmail} by email`);
    if (summary.vendorsMatchedByPhone) parts.push(`${summary.vendorsMatchedByPhone} by phone`);
    if (summary.vendorsMatchedByName) parts.push(`${summary.vendorsMatchedByName} by name`);
    return parts.join(", ");
  };

  const duplicateMessage = useMemo(() => {
    if (!duplicateCount) return "";
    const noun = duplicateCount === 1 ? "activity" : "activities";
    return `${duplicateCount} ${noun} in this file match the name and category of activities that already exist in this project. "Import all" adds everything, creating duplicate entries. "Skip duplicates & import the rest" adds only the new activities and leaves the existing ones untouched.`;
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

  const finishImport = (description: string) => {
    toast({ title: "Activities imported", description });
    setDuplicateConfirmOpen(false);
    resetState();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    // Dry run first: detect duplicates and preview the vendor impact WITHOUT
    // saving anything, so we never commit before the builder has decided.
    const resp = await uploadActivitiesCsv(projectId, selectedFile, false, true);
    if (!resp) return;

    const dupCount = countDuplicatesFromResponse(resp);
    const summary = readVendorSummary(resp);
    setDuplicateCount(dupCount);
    setVendorSummary(summary);

    // Creating vendor records is a side effect on the whole organisation, not
    // just this project — confirm it before the duplicate question.
    if (needsVendorConfirmation(summary)) {
      setVendorConfirmOpen(true);
      return;
    }
    await continueAfterVendorReview(dupCount);
  };

  /** Duplicate question next (if any), otherwise commit. */
  const continueAfterVendorReview = async (dupCount: number) => {
    if (dupCount > 0) {
      setDuplicateConfirmOpen(true);
      return;
    }
    if (!selectedFile) return;
    const commit = await uploadActivitiesCsv(projectId, selectedFile, false, false);
    if (!commit) return;
    finishImport(importSummaryText(readVendorSummary(commit)));
  };

  const handleVendorConfirm = async () => {
    setVendorConfirmOpen(false);
    await continueAfterVendorReview(duplicateCount);
  };

  /** Cancel before commit — the dry run wrote nothing, so there is nothing to undo. */
  const handleVendorCancel = () => {
    setVendorConfirmOpen(false);
    resetState();
    onOpenChange(false);
  };

  const importSummaryText = (summary: VendorImportSummary | null) => {
    if (!summary || (!summary.vendorsCreated && !summary.activitiesLinked)) {
      return "CSV file was uploaded successfully.";
    }
    const bits: string[] = [];
    if (summary.activitiesLinked) {
      bits.push(
        `${summary.activitiesLinked} ${summary.activitiesLinked === 1 ? "activity" : "activities"} linked to vendors`
      );
    }
    if (summary.vendorsCreated) {
      bits.push(
        `${summary.vendorsCreated} new ${summary.vendorsCreated === 1 ? "vendor" : "vendors"} added to your directory`
      );
    }
    return `${bits.join("; ")}.`;
  };

  // Yes → import everything, including the rows flagged as duplicates.
  const handleConfirmDuplicateYes = async () => {
    if (!selectedFile) return;
    const resp = await uploadActivitiesCsv(projectId, selectedFile, true, false);
    if (!resp) return;
    finishImport(importSummaryText(readVendorSummary(resp)));
  };

  // No → import the non-duplicates only; skip the flagged duplicates.
  const handleConfirmDuplicateNo = async () => {
    if (!selectedFile) {
      setDuplicateConfirmOpen(false);
      resetState();
      onOpenChange(false);
      return;
    }
    const resp = await uploadActivitiesCsv(projectId, selectedFile, false, false);
    if (!resp) {
      setDuplicateConfirmOpen(false);
      resetState();
      onOpenChange(false);
      return;
    }
    finishImport(
      `Duplicates were skipped; the remaining activities were imported. ${importSummaryText(
        readVendorSummary(resp)
      )}`
    );
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


      <AlertDialog open={vendorConfirmOpen} onOpenChange={setVendorConfirmOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Vendors in this file</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Vendors named in the CSV are matched against your directory by
                  email, then phone number, then name. Anything with no match is
                  added as a new vendor.
                </p>

                {vendorSummary && (
                  <ul className="space-y-1">
                    {vendorSummary.vendorsMatched > 0 && (
                      <li>
                        <strong>{vendorSummary.vendorsMatched}</strong> existing{" "}
                        {vendorSummary.vendorsMatched === 1 ? "vendor" : "vendors"} matched
                        {vendorMatchBreakdown(vendorSummary)
                          ? ` (${vendorMatchBreakdown(vendorSummary)})`
                          : ""}
                        .
                      </li>
                    )}
                    {vendorSummary.vendorsCreated > 0 && (
                      <li>
                        <strong>{vendorSummary.vendorsCreated}</strong> new{" "}
                        {vendorSummary.vendorsCreated === 1 ? "vendor" : "vendors"} will be
                        created in your directory.
                      </li>
                    )}
                    {vendorSummary.activitiesLinked > 0 && (
                      <li>
                        <strong>{vendorSummary.activitiesLinked}</strong>{" "}
                        {vendorSummary.activitiesLinked === 1 ? "activity" : "activities"}{" "}
                        will be linked to a vendor.
                      </li>
                    )}
                    {vendorSummary.activitiesUnresolved > 0 && (
                      <li>
                        <strong>{vendorSummary.activitiesUnresolved}</strong>{" "}
                        {vendorSummary.activitiesUnresolved === 1 ? "row names" : "rows name"}{" "}
                        a vendor that couldn't be identified — the text is kept, but no
                        link is made.
                      </li>
                    )}
                  </ul>
                )}

                {vendorSummary && vendorWarnings(vendorSummary).length > 0 && (
                  <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-950/30">
                    <p className="font-medium">Worth checking</p>
                    <ul className="mt-1 space-y-1">
                      {vendorWarnings(vendorSummary)
                        .slice(0, 8)
                        .map((w, i) => (
                          <li key={`${w.activity}-${w.warning}-${i}`}>
                            <span className="font-medium">{w.vendor || "Vendor"}</span>
                            {w.activity ? ` on "${w.activity}"` : ""} —{" "}
                            {VENDOR_WARNING_LABELS[w.warning ?? ""] ?? w.warning}
                          </li>
                        ))}
                    </ul>
                    {vendorWarnings(vendorSummary).length > 8 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        …and {vendorWarnings(vendorSummary).length - 8} more.
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  New vendors are added as external contacts. No logins are created and
                  nobody is emailed or messaged — assigning work stays a separate step.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleVendorCancel}>Cancel import</AlertDialogCancel>
            <AlertDialogAction onClick={handleVendorConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate activities detected</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmDuplicateNo}>
              Skip duplicates &amp; import the rest
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDuplicateYes}
            >
              Import all (keep duplicates)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
