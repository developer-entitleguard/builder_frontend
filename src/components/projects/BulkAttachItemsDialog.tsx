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
import { useGetItemsByBuilderQuery } from "@/store/api";

interface BulkAttachItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderId: string;
  /** How many registrations the selection will be applied to (drives copy). */
  registrationCount: number;
  loading?: boolean;
  onConfirm: (itemIds: string[]) => void;
}

/**
 * Pick a set of catalogue items to attach to many registrations at once.
 * Replace semantics — applying this overwrites each selected (pre-handover)
 * registration's current item selection.
 */
export const BulkAttachItemsDialog = ({
  open,
  onOpenChange,
  builderId,
  registrationCount,
  loading,
  onConfirm,
}: BulkAttachItemsDialogProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useGetItemsByBuilderQuery(builderId, {
    skip: !builderId || !open,
  });

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const categories = data?.data ?? [];
  const hasItems = categories.some((c) => (c.items?.length ?? 0) > 0);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach Items</DialogTitle>
          <DialogDescription>
            The selected items will be attached to {registrationCount} registration
            {registrationCount === 1 ? "" : "s"}. This <strong>replaces</strong> the
            current item selection on each one. Handed-over registrations are skipped.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          {isLoading ? (
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={loading || selected.size === 0}
          >
            {loading
              ? "Attaching…"
              : `Attach ${selected.size > 0 ? `${selected.size} ` : ""}item${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
