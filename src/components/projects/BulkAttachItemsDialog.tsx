import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetItemsByBuilderQuery, useGetBillOfMaterialsQuery } from "@/store/api";

interface BulkAttachItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderId: string;
  /** How many registrations the selection will be applied to (drives copy). */
  registrationCount: number;
  loading?: boolean;
  /** Attach a hand-picked set of catalogue items. */
  onConfirm: (itemIds: string[]) => void;
  /** Attach an entire Bill of Materials by id. */
  onConfirmBom: (bomId: string) => void;
}

/**
 * Attach items to many registrations at once, either by hand-picking catalogue
 * items or by selecting a whole Bill of Materials. Both replace each selected
 * (pre-handover) registration's current item selection; handed-over rows are
 * skipped.
 */
export const BulkAttachItemsDialog = ({
  open,
  onOpenChange,
  builderId,
  registrationCount,
  loading,
  onConfirm,
  onConfirmBom,
}: BulkAttachItemsDialogProps) => {
  const [tab, setTab] = useState<"bom" | "items">("bom");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bomId, setBomId] = useState<string>("");

  const { data: itemsData, isLoading: itemsLoading } = useGetItemsByBuilderQuery(builderId, {
    skip: !builderId || !open,
  });
  const { data: bomData, isLoading: bomLoading } = useGetBillOfMaterialsQuery(
    { builderId },
    { skip: !builderId || !open }
  );

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setBomId("");
      setTab("bom");
    }
  }, [open]);

  const categories = itemsData?.data ?? [];
  const hasItems = categories.some((c) => (c.items?.length ?? 0) > 0);
  const boms = bomData?.data ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countLabel = `${registrationCount} registration${registrationCount === 1 ? "" : "s"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach Items</DialogTitle>
          <DialogDescription>
            Applied to {countLabel}. This <strong>replaces</strong> the current item
            selection on each one. Handed-over registrations are skipped.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "bom" | "items")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
            <TabsTrigger value="items">Individual Items</TabsTrigger>
          </TabsList>

          <TabsContent value="bom" className="pt-3">
            {bomLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : boms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No Bills of Materials found. Create one first, then attach it here.
              </p>
            ) : (
              <div className="space-y-2 py-2">
                <Select value={bomId} onValueChange={setBomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Bill of Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    {boms.map((bom) => (
                      <SelectItem key={bom.id} value={bom.id}>
                        {bom.bomName}
                        {bom.projectName ? ` — ${bom.projectName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Attaches every item in the selected BOM (including its warranty and
                  manual files) to each registration.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="items" className="pt-3">
            <ScrollArea className="max-h-[45vh] pr-3">
              {itemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : !hasItems ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No catalogue items found. Add items first, then attach them here.
                </p>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div key={cat.category ?? "Other"}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {cat.category ?? "Other"}
                      </p>
                      <div className="space-y-2">
                        {(cat.items ?? []).map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={selected.has(item.id)}
                              onCheckedChange={() => toggle(item.id)}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              {(item.brand || item.model) && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {[item.brand, item.model].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          {tab === "bom" ? (
            <Button onClick={() => onConfirmBom(bomId)} disabled={loading || !bomId}>
              {loading ? "Attaching…" : "Attach BOM"}
            </Button>
          ) : (
            <Button
              onClick={() => onConfirm(Array.from(selected))}
              disabled={loading || selected.size === 0}
            >
              {loading
                ? "Attaching…"
                : `Attach ${selected.size > 0 ? `${selected.size} ` : ""}item${selected.size === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
