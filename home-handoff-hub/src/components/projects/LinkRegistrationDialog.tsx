import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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

export const LinkRegistrationDialog = ({ 
  open, 
  onOpenChange, 
  projectId, 
  onLinked 
}: LinkRegistrationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<UnlinkedRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUnlinkedRegistrations();
    }
  }, [open]);

  const fetchUnlinkedRegistrations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('homeowner_registrations')
        .select('id, customer_name, customer_email, property_address')
        .eq('builder_id', user.id)
        .is('project_id', null)
        .order('customer_name', { ascending: true });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching registrations",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter(reg =>
    reg.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.property_address.toLowerCase().includes(searchTerm.toLowerCase())
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
      const { error } = await (supabase as any)
        .from('homeowner_registrations')
        .update({ project_id: projectId })
        .in('id', selectedIds);

      if (error) throw error;
      
      toast({
        title: "Registrations linked",
        description: `${selectedIds.length} registration(s) linked to this project.`
      });
      
      setSelectedIds([]);
      onLinked();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error linking registrations",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Link Registrations</DialogTitle>
          <DialogDescription>
            Select existing registrations to link to this project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or address..."
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {registrations.length === 0 
                ? "No unlinked registrations available." 
                : "No registrations match your search."
              }
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredRegistrations.map(reg => (
                <Card 
                  key={reg.id}
                  className={`cursor-pointer transition-colors ${
                    selectedIds.includes(reg.id) ? 'border-primary bg-primary/5' : ''
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
                        <User className="h-4 w-4 text-muted-foreground" />
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
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={selectedIds.length === 0 || isLinking}
          >
            {isLinking 
              ? "Linking..." 
              : `Link ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
