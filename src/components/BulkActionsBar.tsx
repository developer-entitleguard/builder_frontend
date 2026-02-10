import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetBillOfMaterialsQuery,
  useAssignBOMMutation,
  useLazyCheckBOMRestrictionsQuery,
} from "@/store/api";
import { Package, Send, X, AlertTriangle } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  selectedIds,
  onClearSelection,
  onSuccess,
}: BulkActionsBarProps) => {
  const { toast } = useToast();
  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState("");
  const [loading, setLoading] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [mappedCustomers, setMappedCustomers] = useState<Array<{ customerId: string; customerName: string }>>([]);

  const [checkBOMRestrictions] = useLazyCheckBOMRestrictionsQuery();
  const [assignBOM, { isLoading: isAssigningBOM }] = useAssignBOMMutation();

  const {
    data: bomsData,
    isLoading: isLoadingBoms,
    error: bomsError,
  } = useGetBillOfMaterialsQuery(undefined, {
    skip: !bomDialogOpen,
  });

  const boms = bomsData?.data || [];

  useEffect(() => {
    if (bomsError && bomDialogOpen) {
      toast({
        title: "Error loading BOMs",
        description: "Failed to load Bill of Materials. Please try again.",
        variant: "destructive",
      });
    }
  }, [bomsError, bomDialogOpen, toast]);

  const handleAssignBOM = async (skipCheck = false) => {
    if (!selectedBom) {
      toast({
        title: "No BOM selected",
        description: "Please select a Bill of Materials",
        variant: "destructive",
      });
      return;
    }

    if (selectedIds.length === 0) {
      toast({
        title: "No registrations selected",
        description: "Please select at least one registration",
        variant: "destructive",
      });
      return;
    }

    // Check for BOM restrictions first (uses /api/checking/bomrestrict, which internally relies on
    // /api/getbuilderitems/bybom and /api/check/customeritemmap/existing to detect already-mapped customers)
    if (!skipCheck) {
      try {
        const checkResult = await checkBOMRestrictions({ customerIds: selectedIds }).unwrap();

        if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
          setMappedCustomers(checkResult.data);
          setWarningModalOpen(true);
          return;
        }
      } catch (error) {
        // If check fails, log but continue with assignment
        // (backend still enforces correctness)
        console.error("Error checking BOM restrictions:", error);
      }
    }

    setLoading(true);
    try {
      const result = await assignBOM({
        billOfMaterialId: selectedBom,
        customerIds: selectedIds,
      }).unwrap();

      toast({
        title: "Success",
        description: result.message || `BOM assigned to ${selectedCount} registration(s)`,
      });

      setBomDialogOpen(false);
      setSelectedBom("");
      setWarningModalOpen(false);
      setMappedCustomers([]);
      onClearSelection();
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign BOM",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAssign = () => {
    setWarningModalOpen(false);
    handleAssignBOM(true); // Skip the check since user confirmed
  };

  const handleBulkSubmit = async () => {
    if (!selectedBom) {
      setBomDialogOpen(true);
      toast({
        title: "Select BOM",
        description: "Please select a Bill of Materials to submit",
      });
      return;
    }

    if (selectedIds.length === 0) {
      toast({
        title: "No registrations selected",
        description: "Please select at least one registration",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await assignBOM({
        billOfMaterialId: selectedBom,
        customerIds: selectedIds,
      }).unwrap();

      toast({
        title: "Success",
        description: result.message || `${selectedCount} registration(s) submitted successfully`,
      });

      setBomDialogOpen(false);
      setSelectedBom("");
      onClearSelection();
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit registrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-4 rounded-lg shadow-lg flex items-center gap-4">
        <span className="font-semibold">{selectedCount} selected</span>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setBomDialogOpen(true);
            }}
            disabled={loading}
          >
            <Package className="h-4 w-4 mr-2" />
            Assign BOM
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleBulkSubmit();
            }}
            disabled={loading || isAssigningBOM}
          >
            <Send className="h-4 w-4 mr-2" />
            {loading || isAssigningBOM ? "Submitting..." : "Bulk Submit"}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={bomDialogOpen} onOpenChange={setBomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Bill of Materials</DialogTitle>
            <DialogDescription>Select a BOM to assign to {selectedCount} registration(s)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bom-select">Bill of Materials</Label>
              <Select value={selectedBom} onValueChange={setSelectedBom}>
                <SelectTrigger id="bom-select">
                  <SelectValue placeholder="Select a BOM" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {isLoadingBoms ? (
                    <SelectItem value="loading" disabled>
                      Loading BOMs...
                    </SelectItem>
                  ) : bomsError ? (
                    <SelectItem value="error" disabled>
                      Error loading BOMs
                    </SelectItem>
                  ) : boms.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No BOMs available
                    </SelectItem>
                  ) : (
                    boms.map((bom) => (
                      <SelectItem key={bom.id} value={bom.id}>
                        {bom.bomName} {bom.projectName && `(${bom.projectName})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBomDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleAssignBOM(false)}
                disabled={loading || isAssigningBOM || !selectedBom}
              >
                {loading || isAssigningBOM ? "Assigning..." : "Assign BOM"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Modal for BOM Already Mapped */}
      <Dialog open={warningModalOpen} onOpenChange={setWarningModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              BOM Already Mapped
            </DialogTitle>
            <DialogDescription>Bom Already Mapped for a customer</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              The following customer(s) already have a BOM mapped:
            </p>
            <ul className="list-disc list-inside space-y-2">
              {mappedCustomers.map((customer) => (
                <li key={customer.customerId} className="text-sm">
                  <span className="font-medium">{customer.customerName}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Do you want to proceed with assigning the BOM anyway?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWarningModalOpen(false);
                setMappedCustomers([]);
              }}
            >
              No
            </Button>
            <Button onClick={handleConfirmAssign} disabled={loading || isAssigningBOM}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
