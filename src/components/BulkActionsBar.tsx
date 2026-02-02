import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Package, Send, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export const BulkActionsBar = ({ selectedCount, selectedIds, onClearSelection, onSuccess }: BulkActionsBarProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [boms, setBoms] = useState<any[]>([]);
  const [selectedBom, setSelectedBom] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bomDialogOpen) {
      fetchBOMs();
    }
  }, [bomDialogOpen]);

  const fetchBOMs = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('bill_of_materials')
        .select('*')
        .eq('builder_id', user.id)
        .order('name');

      if (error) throw error;
      setBoms(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading BOMs",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAssignBOM = async () => {
    if (!selectedBom) {
      toast({
        title: "No BOM selected",
        description: "Please select a Bill of Materials",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Update all selected registrations
      const { error } = await supabase
        .from('homeowner_registrations')
        .update({ 
          selected_items: { bom_id: selectedBom },
          status: 'ready_for_review'
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `BOM assigned to ${selectedCount} registration(s)`
      });

      setBomDialogOpen(false);
      setSelectedBom('');
      onClearSelection();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('homeowner_registrations')
        .update({ 
          status: 'sent',
          entitlement_sent_at: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedCount} registration(s) submitted successfully`
      });

      onClearSelection();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
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
            variant="secondary" 
            size="sm"
            onClick={() => setBomDialogOpen(true)}
            disabled={loading}
          >
            <Package className="h-4 w-4 mr-2" />
            Assign BOM
          </Button>
          
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleBulkSubmit}
            disabled={loading}
          >
            <Send className="h-4 w-4 mr-2" />
            Bulk Submit
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
            <DialogDescription>
              Select a BOM to assign to {selectedCount} registration(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bom-select">Bill of Materials</Label>
              <Select value={selectedBom} onValueChange={setSelectedBom}>
                <SelectTrigger id="bom-select">
                  <SelectValue placeholder="Select a BOM" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.name} {bom.project_name && `(${bom.project_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBomDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignBOM} disabled={loading || !selectedBom}>
                {loading ? 'Assigning...' : 'Assign BOM'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
