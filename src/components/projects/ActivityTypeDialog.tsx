import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { ListTodo, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { ActivityPriority, ActivityStatus } from '@/hooks/useActivities';

interface ActivityTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentMaxOrder: number;
  onSuccess?: () => void;
  onSingleAdd?: () => void;
}

const validStatuses: ActivityStatus[] = ['pending', 'in_progress', 'done'];
const validPriorities: ActivityPriority[] = ['low', 'medium', 'high', 'urgent'];

export const ActivityTypeDialog = ({ 
  open, 
  onOpenChange, 
  projectId,
  currentMaxOrder,
  onSuccess,
  onSingleAdd 
}: ActivityTypeDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [selectedType, setSelectedType] = useState<'single' | 'bulk' | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSingleActivity = () => {
    onOpenChange(false);
    setSelectedType(null);
    onSingleAdd?.();
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
      const requiredHeaders = ['name'];
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
      let orderIndex = currentMaxOrder;
      const activities = rows.slice(1).map(row => {
        // Handle CSV parsing with potential commas in quoted fields
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const activity: any = {
          project_id: projectId,
          builder_id: user?.id,
          organization_id: organization?.id,
          status: 'pending',
          priority: 'medium',
          order_index: orderIndex++
        };
        
        headers.forEach((header, index) => {
          const value = values[index]?.replace(/^"|"$/g, ''); // Remove surrounding quotes
          if (value) {
            if (header === 'name') {
              activity.name = value;
            } else if (header === 'description') {
              activity.description = value;
            } else if (header === 'status') {
              const status = value.toLowerCase() as ActivityStatus;
              if (validStatuses.includes(status)) {
                activity.status = status;
              }
            } else if (header === 'priority') {
              const priority = value.toLowerCase() as ActivityPriority;
              if (validPriorities.includes(priority)) {
                activity.priority = priority;
              }
            } else if (header === 'due_date') {
              // Validate date format
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
              if (dateRegex.test(value)) {
                activity.due_date = value;
              }
            }
          }
        });
        
        return activity;
      }).filter(a => a.name); // Filter out rows without a name

      if (activities.length === 0) {
        toast({
          title: "No valid activities",
          description: "Please ensure at least one row has a valid name",
          variant: "destructive"
        });
        setUploading(false);
        return;
      }

      // Insert activities
      const { error } = await (supabase as any)
        .from('project_activities')
        .insert(activities);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${activities.length} activit${activities.length === 1 ? 'y' : 'ies'} imported successfully`
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

  const downloadTemplate = () => {
    const headers = ["name", "description", "status", "priority", "due_date"];
    const sampleRows = [
      ["Foundation Inspection", "Review concrete foundation for compliance", "not_started", "high", "2024-06-15"],
      ["Frame Installation", "Timber frame construction phase", "not_started", "medium", "2024-07-01"],
      ["Electrical Rough-In", "Initial electrical wiring installation", "not_started", "medium", ""]
    ];
    
    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "activities_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedType(null);
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
                Required column: name
              </p>
              <p className="text-xs text-muted-foreground">
                Optional columns: description, status, priority, due_date
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Status values:</strong> not_started, in_progress, completed, blocked
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Priority values:</strong> low, medium, high, urgent
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Date format:</strong> YYYY-MM-DD
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
