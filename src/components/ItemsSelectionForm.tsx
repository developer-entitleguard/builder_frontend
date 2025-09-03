import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useToast } from "@/hooks/use-toast";
import { 
  Home, 
  Lightbulb, 
  Wrench, 
  Sun, 
  Building,
  ChevronRight
} from "lucide-react";

interface BuilderItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  price: number | null;
}

interface ItemsSelectionFormProps {
  onNext: (data: any) => void;
  initialData?: any;
  registrationId?: string;
}

const ItemsSelectionForm = ({ onNext, initialData, registrationId }: ItemsSelectionFormProps) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { updateRegistration } = useRegistrations();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>(initialData?.selected_items || []);
  const [availableItems, setAvailableItems] = useState<BuilderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('ItemsSelectionForm - user changed:', { user: !!user });
    if (user) {
      fetchAvailableItems();
    } else {
      console.log('ItemsSelectionForm - No user, setting loading to false');
      setLoading(false);
    }
  }, [user]);

  const fetchAvailableItems = async () => {
    if (!user) {
      console.log('ItemsSelectionForm - No user, cannot fetch items');
      setLoading(false);
      return;
    }
    
    console.log('ItemsSelectionForm - fetchAvailableItems started for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('builder_items')
        .select('*')
        .eq('builder_id', user.id)
        .eq('status', 'active')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      console.log('ItemsSelectionForm - fetchAvailableItems result:', { data, error });
      if (error) throw error;
      setAvailableItems(data || []);
      console.log('ItemsSelectionForm - availableItems set:', data?.length || 0, 'items');
    } catch (error: any) {
      console.error('ItemsSelectionForm - fetchAvailableItems error:', error);
      toast({
        title: "Error fetching items",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      console.log('ItemsSelectionForm - setting loading to false');
      setLoading(false);
    }
  };

  const groupedItems = availableItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BuilderItem[]>);

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Appliances': <Home className="h-5 w-5" />,
      'Kitchen': <Home className="h-5 w-5" />,
      'Bathroom': <Lightbulb className="h-5 w-5" />,
      'Electrical': <Lightbulb className="h-5 w-5" />,
      'Flooring': <Building className="h-5 w-5" />,
      'Trim': <Wrench className="h-5 w-5" />,
      'Other': <Building className="h-5 w-5" />
    };
    return iconMap[category] || <Building className="h-5 w-5" />;
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const isSelected = prev.includes(itemId);
      
      if (isSelected) {
        return prev.filter(i => i !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleNext = async () => {
    if (!registrationId) {
      onNext({ selected_items: selectedItems });
      return;
    }

    setSaving(true);
    try {
      await updateRegistration(registrationId, {
        selected_items: selectedItems
      });
      
      toast({
        title: "Items selected",
        description: "Moving to document upload"
      });
      
      onNext({ selected_items: selectedItems, registrationId });
    } catch (error: any) {
      toast({
        title: "Error saving items",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Loading Items...</h2>
          <p className="text-muted-foreground mt-1">Fetching your organization's item catalog</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Select Items</h2>
          <p className="text-muted-foreground mt-1">Choose from your organization's available items</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {selectedItems.length} items selected
        </Badge>
      </div>

      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No items available. Please contact your administrator to add items to the catalog.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category} className="hover:shadow-medium transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {getCategoryIcon(category)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <CardDescription>{items.length} items available</CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {selectedItems.filter(id => items.some(item => item.id === id)).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleItemToggle(item.id)}
                    />
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {(item.brand || item.model) && (
                          <div className="text-xs text-muted-foreground">
                            {[item.brand, item.model].filter(Boolean).join(' - ')}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          Select items to proceed to document upload
        </p>
        <Button 
          onClick={handleNext}
          disabled={selectedItems.length === 0 || saving}
          size="lg"
          className="min-w-32"
        >
          {saving ? 'Saving...' : 'Continue'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ItemsSelectionForm;