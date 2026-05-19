import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGetNonLinkedRegistrationsQuery, useUpdateProjectRegistrationsMutation } from "@/store/api/projects";
import type { NonLinkedRegistrationApi } from "@/store/api/projects";
import { Search, User } from "lucide-react";

interface UnlinkedRegistration {
  id: string;
  customer_name: string;
  customer_email: string;
  property_address: string;
}

interface LinkRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onLinked: () => void;
}

function mapNonLinkedToDisplay(r: NonLinkedRegistrationApi): UnlinkedRegistration {
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const firstName = str(r.firstName).trim();
  const lastName = str(r.lastName).trim();
  const customer_name = [firstName, lastName].filter(Boolean).join(" ") || "—";
  const customer_email = str(r.email) || "—";
  const address = str(r.address).trim();
  const cityStateZip = [str(r.city), str(r.state), str(r.zip)].filter(Boolean).join(" ").trim();
  const property_address = [address, cityStateZip].filter(Boolean).join(", ") || "—";
  return {
    id: r.id,
    customer_name,
    customer_email,
    property_address,
  };
}

export const LinkRegistrationDialog = ({ 
  open, 
  onOpenChange, 
  projectId, 
  onLinked 
}: LinkRegistrationDialogProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [updateProjectRegistrations] = useUpdateProjectRegistrationsMutation();

  const { data: registrationsResponse, isLoading: loading, isError, error } = useGetNonLinkedRegistrationsQuery(
    undefined,
    { skip: !open }
  );

  useEffect(() => {
    if (open && isError && error) {
      toast({
        title: "Error fetching registrations",
        description: "message" in error ? String(error.message) : "Failed to load registrations",
        variant: "destructive",
      });
    }
  }, [open, isError, error, toast]);

  const registrations = useMemo(() => {
    if (!registrationsResponse?.success || !Array.isArray(registrationsResponse.data)) {
      return [];
    }
    return registrationsResponse.data.map(mapNonLinkedToDisplay);
  }, [registrationsResponse]);

  const filteredRegistrations = registrations.filter(reg =>
    (reg.customer_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reg.customer_email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reg.property_address ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLink = async () => {
    if (selectedIds.length === 0) return;

    setIsLinking(true);
    try {
      await updateProjectRegistrations({
        projectId,
        builderCustomerIds: selectedIds,
      }).unwrap();

      toast({
        title: "Registrations linked",
        description: `${selectedIds.length} registration(s) linked to this project.`,
      });

      setSelectedIds([]);
      onLinked();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: "Error linking registrations",
        description: err instanceof Error ? err.message : "Failed to link registrations",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[calc(100%-2rem)] max-w-[500px] max-h-[85vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Link Registrations</DialogTitle>
          <DialogDescription>
            Select existing registrations to link to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 py-4 overflow-hidden">
          <div className="relative mb-4 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or address..."
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 flex-1 min-h-[120px]">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 flex-shrink-0">
              {registrations.length === 0
                ? "No unlinked registrations available."
                : "No registrations match your search."}
            </p>
          ) : (
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 -mr-1">
              {filteredRegistrations.map(reg => (
                <Card
                  key={reg.id}
                  className={`cursor-pointer transition-colors flex-shrink-0 ${
                    selectedIds.includes(reg.id) ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => toggleSelection(reg.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.includes(reg.id)}
                      onCheckedChange={() => toggleSelection(reg.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate">{reg.customer_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{reg.customer_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{reg.property_address}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={selectedIds.length === 0 || isLinking}
          >
            {isLinking
              ? "Linking..."
              : `Link ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
