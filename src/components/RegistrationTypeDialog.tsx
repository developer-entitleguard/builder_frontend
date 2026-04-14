import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { getApiBaseUrl } from '@/lib/config';
import { User, Users, Upload, Download } from 'lucide-react';

interface RegistrationTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RegistrationTypeDialog = ({ open, onOpenChange, onSuccess }: RegistrationTypeDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { organization } = useOrganization();
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

    const builderOrganizationId = organization?.id;
    if (!builderOrganizationId) {
      toast({
        title: "Error",
        description: "Organization not found. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Get JWT from localStorage
      const userData = localStorage.getItem('userData');
      let authToken = '';
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed.jwt) authToken = parsed.jwt;
        } catch { /* ignore */ }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('builderOrganizationId', builderOrganizationId);

      const response = await fetch(`${getApiBaseUrl()}/api/upload/registration-template`, {
        method: 'POST',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to upload CSV');
      }

      toast({
        title: "Success",
        description: result.message || "Registrations created successfully"
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

  const downloadTemplate = async () => {
    try {
      const userData = localStorage.getItem('userData');
      let authToken = '';
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed.jwt) authToken = parsed.jwt;
        } catch { /* ignore */ }
      }

      const response = await fetch(`${getApiBaseUrl()}/api/download/registration-template`, {
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
      });

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "registration_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: generate locally with backend-expected headers
      const headers = ["First_name", "Last_name", "customer_email", "property_address", "property_city", "property_state", "property_zip", "customer_phone", "project_name", "settlement_date", "notes"];
      const sampleRow = ["John", "Smith", "john.smith@email.com", "123 Main Street", "Sydney", "NSW", "2000", "0412345678", "Sunrise Estate", "2024-06-15", "Corner lot unit"];

      const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "registration_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
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
                Required columns: First_name, Last_name, customer_email, property_address, property_city, property_state, property_zip
              </p>
              <p className="text-xs text-muted-foreground">
                Optional columns: customer_phone, project_name, settlement_date, notes
              </p>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
