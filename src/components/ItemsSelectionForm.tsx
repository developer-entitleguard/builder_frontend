import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Lightbulb, 
  Wrench, 
  Sun, 
  Building,
  ChevronRight
} from "lucide-react";

interface ItemCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  items: string[];
}

interface ItemsSelectionFormProps {
  onNext: (data: any) => void;
  initialData?: any;
}

const ItemsSelectionForm = ({ onNext, initialData }: ItemsSelectionFormProps) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>(initialData || {});

  const categories: ItemCategory[] = [
    {
      id: 'appliances',
      name: 'Appliances',
      description: 'Kitchen and home appliances',
      icon: <Home className="h-5 w-5" />,
      items: ['Refrigerator', 'Dishwasher', 'Oven', 'Microwave', 'Washer', 'Dryer', 'HVAC System']
    },
    {
      id: 'fittings',
      name: 'Fittings & Fixtures',
      description: 'Plumbing and electrical fixtures',
      icon: <Lightbulb className="h-5 w-5" />,
      items: ['Light Fixtures', 'Ceiling Fans', 'Faucets', 'Toilets', 'Shower Heads', 'Cabinet Hardware']
    },
    {
      id: 'additional',
      name: 'Additional Items',
      description: 'Solar panels and extra features',
      icon: <Sun className="h-5 w-5" />,
      items: ['Solar Panels', 'Battery Storage', 'Smart Home System', 'Security System', 'Garage Door Opener']
    },
    {
      id: 'structural',
      name: 'Structural Components',
      description: 'Building structure and materials',
      icon: <Building className="h-5 w-5" />,
      items: ['Roof', 'Windows', 'Doors', 'Flooring', 'Insulation', 'Foundation', 'Siding']
    }
  ];

  const handleItemToggle = (categoryId: string, itemId: string) => {
    setSelectedItems(prev => {
      const categoryItems = prev[categoryId] || [];
      const isSelected = categoryItems.includes(itemId);
      
      if (isSelected) {
        return {
          ...prev,
          [categoryId]: categoryItems.filter(i => i !== itemId)
        };
      } else {
        return {
          ...prev,
          [categoryId]: [...categoryItems, itemId]
        };
      }
    });
  };

  const getTotalSelectedItems = () => {
    return Object.values(selectedItems).reduce((total, items) => total + items.length, 0);
  };

  const handleNext = () => {
    onNext(selectedItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Select Items</h2>
          <p className="text-muted-foreground mt-1">Choose appliances, fittings, and structural components to include</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {getTotalSelectedItems()} items selected
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((category) => (
          <Card key={category.id} className="hover:shadow-medium transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {category.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {selectedItems[category.id]?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.items.map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${category.id}-${item}`}
                    checked={selectedItems[category.id]?.includes(item) || false}
                    onCheckedChange={() => handleItemToggle(category.id, item)}
                  />
                  <label
                    htmlFor={`${category.id}-${item}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {item}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          Select items to proceed to document upload
        </p>
        <Button 
          onClick={handleNext}
          disabled={getTotalSelectedItems() === 0}
          size="lg"
          className="min-w-32"
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ItemsSelectionForm;