import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useToast } from "@/hooks/use-toast";
import { 
  Home, 
  Lightbulb, 
  Wrench, 
  Building,
  ChevronRight,
  Trash2,
  Plus,
  Edit2
} from "lucide-react";

interface BuilderItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  make: string | null;
  description: string | null;
  price: number | null;
  bom_id: string | null;
}

interface RegistrationItem extends BuilderItem {
  color?: string;
  custom_notes?: string;
  is_custom?: boolean;
}

interface BillOfMaterials {
  id: string;
  name: string;
  project_name: string | null;
}

interface ItemsSelectionFormProps {
  onNext: (data: any) => void;
  initialData?: any;
  registrationId?: string;
}

const ItemsSelectionForm = ({ onNext, initialData, registrationId }: ItemsSelectionFormProps) => {
  const { user } = useAuth();
  const { updateRegistration } = useRegistrations();
  const { toast } = useToast();
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [selectedItems, setSelectedItems] = useState<RegistrationItem[]>(
    Array.isArray(initialData?.selected_items) ? initialData.selected_items : []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBOMs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchBOMs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('bill_of_materials')
        .select('*')
        .eq('builder_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoms(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching BOMs",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadItemsFromBOM = async (bomId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('builder_items')
        .select('*')
        .eq('bom_id', bomId)
        .eq('builder_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      
      // Auto-select all items from BOM
      const items: RegistrationItem[] = (data || []).map(item => ({
        ...item,
        color: '',
        custom_notes: ''
      }));
      
      setSelectedItems(items);
      toast({
        title: "Items loaded",
        description: `${items.length} items loaded from BOM`,
      });
    } catch (error: any) {
      toast({
        title: "Error loading items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleBOMSelect = (bomId: string) => {
    setSelectedBomId(bomId);
    loadItemsFromBOM(bomId);
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateItem = (itemId: string, field: string, value: string) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleAddCustomItem = () => {
    const newItem: RegistrationItem = {
      id: `custom_${Date.now()}`,
      name: '',
      category: 'Other',
      brand: '',
      model: '',
      make: '',
      description: '',
      price: null,
      bom_id: null,
      color: '',
      custom_notes: '',
      is_custom: true
    };
    setSelectedItems(prev => [...prev, newItem]);
    setEditingItemId(newItem.id);
  };

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

  const handleNext = async () => {
    // Validate that all custom items have names
    const invalidCustomItems = selectedItems.filter(item => item.is_custom && !item.name.trim());
    if (invalidCustomItems.length > 0) {
      toast({
        title: "Missing item names",
        description: "Please provide names for all custom items",
        variant: "destructive"
      });
      return;
    }

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
        title: "Items saved",
        description: "Your item selection has been saved successfully",
      });
      
      onNext({ selected_items: selectedItems });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Warranty Items</h2>
        <p className="text-muted-foreground">
          Choose a Bill of Materials and customize items for this homeowner
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Bill of Materials</CardTitle>
              <CardDescription>Choose a BOM to load items from</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedBomId} onValueChange={handleBOMSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Bill of Materials" />
                </SelectTrigger>
                <SelectContent>
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.name} {bom.project_name && `(${bom.project_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedItems.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Selected Items ({selectedItems.length})</span>
                    <Button onClick={handleAddCustomItem} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedItems.map((item) => {
                    const isEditing = editingItemId === item.id;
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(item.category)}
                            <div>
                              {isEditing || item.is_custom ? (
                                <Input
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                  placeholder="Item name"
                                  className="mb-2"
                                />
                              ) : (
                                <h4 className="font-semibold">{item.name}</h4>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingItemId(isEditing ? null : item.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {(isEditing || item.is_custom) && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`make-${item.id}`}>Make</Label>
                              <Input
                                id={`make-${item.id}`}
                                value={item.make || ''}
                                onChange={(e) => handleUpdateItem(item.id, 'make', e.target.value)}
                                placeholder="e.g., Samsung"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`brand-${item.id}`}>Brand</Label>
                              <Input
                                id={`brand-${item.id}`}
                                value={item.brand || ''}
                                onChange={(e) => handleUpdateItem(item.id, 'brand', e.target.value)}
                                placeholder="e.g., SmartThings"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`model-${item.id}`}>Model</Label>
                              <Input
                                id={`model-${item.id}`}
                                value={item.model || ''}
                                onChange={(e) => handleUpdateItem(item.id, 'model', e.target.value)}
                                placeholder="e.g., XYZ-123"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`color-${item.id}`}>Color</Label>
                              <Input
                                id={`color-${item.id}`}
                                value={item.color || ''}
                                onChange={(e) => handleUpdateItem(item.id, 'color', e.target.value)}
                                placeholder="e.g., White"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label htmlFor={`notes-${item.id}`}>Notes</Label>
                              <Input
                                id={`notes-${item.id}`}
                                value={item.custom_notes || ''}
                                onChange={(e) => handleUpdateItem(item.id, 'custom_notes', e.target.value)}
                                placeholder="Additional notes specific to this homeowner"
                              />
                            </div>
                          </div>
                        )}

                        {!isEditing && !item.is_custom && (
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {item.make && <span>Make: {item.make}</span>}
                            {item.brand && <span>• Brand: {item.brand}</span>}
                            {item.model && <span>• Model: {item.model}</span>}
                            {item.color && <span>• Color: {item.color}</span>}
                            {item.custom_notes && (
                              <div className="w-full mt-1 text-xs">
                                Notes: {item.custom_notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={selectedItems.length === 0 || saving}
                  size="lg"
                >
                  {saving ? "Saving..." : "Continue"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ItemsSelectionForm;
