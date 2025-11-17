import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { User, Users, Upload } from 'lucide-react';

interface RegistrationTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RegistrationTypeDialog = ({ open, onOpenChange, onSuccess }: RegistrationTypeDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<'single' | 'bulk' | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSingleRegistration = () => {
    onOpenChange(false);
    navigate('/onboarding');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);

    try {
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['customer_name', 'customer_email', 'property_address', 'property_city', 'property_state', 'property_zip'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        toast({
          title: "Invalid CSV format",
          description: `Missing required columns: ${missingHeaders.join(', ')}`,
          variant: "destructive"
        });
        setUploading(false);
        return;
      }

      // Parse data rows
      const registrations = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        const registration: any = {
          builder_id: user?.id,
          status: 'draft'
        };
        
        headers.forEach((header, index) => {
          if (values[index]) {
            registration[header] = values[index];
          }
        });
        
        return registration;
      });

      // Insert registrations
      const { error } = await supabase
        .from('homeowner_registrations')
        .insert(registrations);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${registrations.length} registration(s) created successfully`
      });

      onOpenChange(false);
      setSelectedType(null);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process CSV file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedType === null && "New Registration"}
            {selectedType === 'single' && "Single Registration"}
            {selectedType === 'bulk' && "Bulk Registration"}
          </DialogTitle>
          <DialogDescription>
            {selectedType === null && "Choose how you want to create registrations"}
            {selectedType === 'single' && "Create a single homeowner registration"}
            {selectedType === 'bulk' && "Upload a CSV file to create multiple registrations"}
          </DialogDescription>
        </DialogHeader>

        {selectedType === null && (
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleSingleRegistration}
            >
              <User className="h-8 w-8" />
              <span className="font-semibold">Single Registration</span>
              <span className="text-xs text-muted-foreground">Create one registration at a time</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => setSelectedType('bulk')}
            >
              <Users className="h-8 w-8" />
              <span className="font-semibold">Bulk Registration</span>
              <span className="text-xs text-muted-foreground">Upload CSV to create multiple</span>
            </Button>
          </div>
        )}

        {selectedType === 'bulk' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Required columns: customer_name, customer_email, property_address, property_city, property_state, property_zip
              </p>
              <p className="text-xs text-muted-foreground">
                Optional columns: customer_phone, project_name, settlement_date, notes
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
