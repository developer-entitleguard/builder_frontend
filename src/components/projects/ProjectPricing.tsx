import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Sparkles, 
  RefreshCw, 
  Package, 
  HardHat, 
  Users, 
  Building2,
  Info,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  TrendingUp,
  DollarSign,
  Percent,
  Clock
} from "lucide-react";
import { useProjectPricing, CostItem, CostCategory } from "@/hooks/useProjectPricing";
import { Project } from "@/hooks/useProjects";
import { Activity } from "@/hooks/useActivities";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProjectPricingMutation } from "@/store/api/pricing";

interface ProjectPricingProps {
  project: Project;
  activities: Activity[];
}

const categoryConfig: Record<CostCategory, { icon: React.ElementType; label: string; color: string }> = {
  materials: { icon: Package, color: "bg-blue-100 text-blue-700", label: "Materials" },
  labour: { icon: HardHat, color: "bg-orange-100 text-orange-700", label: "Labour" },
  subcontractors: { icon: Users, color: "bg-purple-100 text-purple-700", label: "Subcontractors" },
  overheads: { icon: Building2, color: "bg-slate-100 text-slate-700", label: "Other / Overheads" },
};

export const ProjectPricing = ({ project, activities }: ProjectPricingProps) => {
  const {
    pricing,
    costItems,
    groupedCostItems,
    loading,
    generating,
    generatePricing,
    updateCostItem,
    deleteCostItem,
    addCostItem,
    updateBufferMargin
  } = useProjectPricing(project.id);

  const { toast } = useToast();
  const [updateProjectPricing, { isLoading: savingPricing }] = useUpdateProjectPricingMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [bufferMode, setBufferMode] = useState<'percentage' | 'amount'>('percentage');
  const [marginMode, setMarginMode] = useState<'percentage' | 'amount'>('percentage');
  const [bufferValue, setBufferValue] = useState<number>(0);
  const [marginValue, setMarginValue] = useState<number>(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    category: 'materials' as CostCategory,
    name: '',
    description: '',
    total_cost: 0
  });

  // Initialize buffer/margin values when pricing loads
  useState(() => {
    if (pricing) {
      setBufferValue(pricing.buffer_percentage || pricing.buffer_amount);
      setBufferMode(pricing.buffer_percentage > 0 ? 'percentage' : 'amount');
      setMarginValue(pricing.margin_percentage || pricing.margin_amount);
      setMarginMode(pricing.margin_percentage > 0 ? 'percentage' : 'amount');
    }
  });

  const handleGenerate = async () => {
    await generatePricing(project, activities);
  };

  const handleEditStart = (item: CostItem) => {
    setEditingId(item.id);
    setEditValue(item.total_cost);
  };

  const handleEditSave = async (itemId: string) => {
    await updateCostItem(itemId, { total_cost: editValue });
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleBufferChange = async () => {
    await updateBufferMargin({
      buffer_percentage: bufferMode === 'percentage' ? bufferValue : 0,
      buffer_amount: bufferMode === 'amount' ? bufferValue : 0
    });
  };

  const handleMarginChange = async () => {
    await updateBufferMargin({
      margin_percentage: marginMode === 'percentage' ? marginValue : 0,
      margin_amount: marginMode === 'amount' ? marginValue : 0
    });
  };

  const handleAddItem = async () => {
    if (!newItem.name || newItem.total_cost <= 0) return;
    
    await addCostItem({
      category: newItem.category,
      name: newItem.name,
      description: newItem.description,
      total_cost: newItem.total_cost,
      unit_rate: null,
      quantity: 1,
      linked_activity_id: null,
      is_ai_generated: false,
      is_modified: false,
      ai_assumptions: null,
      from_bom: false
    });
    
    setShowAddDialog(false);
    setNewItem({ category: 'materials', name: '', description: '', total_cost: 0 });
  };

  const getCategoryTotal = (category: CostCategory) => {
    return (groupedCostItems[category] || []).reduce((sum, item) => sum + Number(item.total_cost), 0);
  };

  const getActivityName = (activityId: string | null) => {
    if (!activityId) return null;
    const activity = activities.find(a => a.id === activityId);
    return activity?.name || null;
  };

  const handleSyncPricingToApi = async () => {
    if (!pricing) return;

    try {
      await updateProjectPricing({
        projectId: project.id,
        id: pricing.id,
        body: {
          baseEstimatedCost: pricing.total_estimated_cost,
          bufferAmount: pricing.buffer_amount,
          bufferPercentage: pricing.buffer_percentage,
          finalPrice: pricing.final_price,
          marginAmount: pricing.margin_amount,
          marginPercentage: pricing.margin_percentage,
          totalEstimatedCost: pricing.total_estimated_cost,
        },
      }).unwrap();

      toast({
        title: "Pricing updated",
        description: "Pricing summary has been synced to the builder API.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update project pricing.";
      toast({
        title: "Error updating pricing",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Empty state - show CTA
  if (!pricing) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Generate Project Cost using AI</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Let AI analyze your project details and activities to generate a comprehensive 
            cost breakdown based on Australian building standards and current market rates.
          </p>
          <Button 
            size="lg" 
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Cost Estimate
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Based on {activities.length} activities • {project.property_type} • {project.city}, {project.state}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pricing view
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold">
                  ${pricing.total_estimated_cost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buffer</p>
                <p className="text-2xl font-bold">
                  ${pricing.buffer_amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margin</p>
                <p className="text-2xl font-bold">
                  ${pricing.margin_amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Final Price</p>
                <p className="text-2xl font-bold">
                  ${pricing.final_price.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regenerate & Last Updated */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last generated: {format(new Date(pricing.updated_at), 'dd MMM yyyy, HH:mm')}
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Cost Item</DialogTitle>
                <DialogDescription>
                  Manually add a new cost item to your project estimate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={newItem.category} 
                    onValueChange={(v) => setNewItem({ ...newItem, category: v as CostCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g., Additional site cleanup"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea 
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Brief description..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Cost ($)</Label>
                  <Input 
                    type="number"
                    value={newItem.total_cost || ''}
                    onChange={(e) => setNewItem({ ...newItem, total_cost: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      {/* Cost Breakdown by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>
            Review and adjust AI-generated cost estimates. Modified values are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['materials', 'labour', 'subcontractors', 'overheads']} className="space-y-2">
            {(Object.keys(categoryConfig) as CostCategory[]).map((category) => {
              const config = categoryConfig[category];
              const items = groupedCostItems[category] || [];
              const CategoryIcon = config.icon;
              const categoryTotal = getCategoryTotal(category);
              
              return (
                <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <CategoryIcon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{config.label}</span>
                        <Badge variant="secondary">{items.length} items</Badge>
                      </div>
                      <span className="font-semibold">
                        ${categoryTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No items in this category
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Item</TableHead>
                            <TableHead>Activity</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id} className={item.is_modified ? "bg-amber-50" : ""}>
                              <TableCell>
                                <div className="flex items-start gap-2">
                                  <div>
                                    <p className="font-medium">{item.name}</p>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground">{item.description}</p>
                                    )}
                                  </div>
                                  {item.ai_assumptions && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-xs">{item.ai_assumptions}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getActivityName(item.linked_activity_id) ? (
                                  <Badge variant="outline" className="text-xs">
                                    {getActivityName(item.linked_activity_id)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.from_bom ? (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                    BOM
                                  </Badge>
                                ) : item.is_ai_generated ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    AI
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Manual</Badge>
                                )}
                                {item.is_modified && (
                                  <Badge variant="outline" className="ml-1 text-xs border-amber-500 text-amber-600">
                                    Modified
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {editingId === item.id ? (
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                                    className="w-28 text-right"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-medium">
                                    ${Number(item.total_cost).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {editingId === item.id ? (
                                    <>
                                      <Button size="icon" variant="ghost" onClick={() => handleEditSave(item.id)}>
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={handleEditCancel}>
                                        <X className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="icon" variant="ghost" onClick={() => handleEditStart(item)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => deleteCostItem(item.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Buffer & Margin Section */}
      <Card>
        <CardHeader>
          <CardTitle>Buffer & Margin</CardTitle>
          <CardDescription>
            Add contingency buffer and profit margin to calculate the final project price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buffer */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Buffer (Contingency)</Label>
                <Select value={bufferMode} onValueChange={(v) => setBufferMode(v as 'percentage' | 'amount')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={bufferValue}
                    onChange={(e) => setBufferValue(parseFloat(e.target.value) || 0)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {bufferMode === 'percentage' ? '%' : '$'}
                  </span>
                </div>
                <Button variant="secondary" onClick={handleBufferChange}>Apply</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Buffer amount: ${pricing.buffer_amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Margin */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Margin (Profit)</Label>
                <Select value={marginMode} onValueChange={(v) => setMarginMode(v as 'percentage' | 'amount')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={marginValue}
                    onChange={(e) => setMarginValue(parseFloat(e.target.value) || 0)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {marginMode === 'percentage' ? '%' : '$'}
                  </span>
                </div>
                <Button variant="secondary" onClick={handleMarginChange}>Apply</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Margin amount: ${pricing.margin_amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Final Calculation Summary */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Cost</span>
              <span>${pricing.total_estimated_cost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Buffer</span>
              <span>${pricing.buffer_amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Margin</span>
              <span>${pricing.margin_amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Final Project Price</span>
              <span className="text-primary">
                ${pricing.final_price.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Cost vs Price Difference</span>
              <span className="text-green-600 font-medium">
                +${(pricing.final_price - pricing.total_estimated_cost).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                {' '}
                ({(((pricing.final_price - pricing.total_estimated_cost) / pricing.total_estimated_cost) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button 
          variant="default" 
          onClick={handleSyncPricingToApi}
          disabled={savingPricing || !pricing}
        >
          {savingPricing ? "Saving..." : "Save Pricing"}
        </Button>
      </div>

      {/* Disclaimer */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            <Info className="h-4 w-4 inline mr-1" />
            This pricing model is for estimation and planning purposes only. 
            AI-generated costs are based on typical Australian building rates and may vary based on actual conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
