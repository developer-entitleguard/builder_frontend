import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, ActivityPriority, CreateActivityData } from "@/hooks/useActivities";
import type { ActivityCategory } from "@/hooks/useActivityCategories";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateActivityData) => Promise<Activity | null>;
  categories?: ActivityCategory[];
  defaultCategoryId?: string | null;
}

export const AddActivityDialog = ({ open, onOpenChange, onSubmit, categories = [], defaultCategoryId }: AddActivityDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ActivityPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    const result = await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      category_id: categoryId ?? undefined
    });
    setIsSubmitting(false);
    
    if (result) {
      setName("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setCategoryId(defaultCategoryId ?? null);
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (open && defaultCategoryId !== undefined) setCategoryId(defaultCategoryId);
  }, [open, defaultCategoryId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
          <DialogDescription>
            Create a new activity to track progress on this project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="activity-name">Activity Name *</Label>
            <Input
              id="activity-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Foundation inspection"
              className="mt-1.5"
            />
          </div>
          
          <div>
            <Label htmlFor="activity-description">Description</Label>
            <Textarea
              id="activity-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details about this activity..."
              className="mt-1.5"
              rows={3}
            />
          </div>
          
          {categories.length > 0 && (
            <div>
              <Label htmlFor="activity-category">Category</Label>
              <Select value={categoryId ?? ""} onValueChange={v => setCategoryId(v || null)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Uncategorized</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="activity-priority">Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as ActivityPriority)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="activity-due-date">Due Date</Label>
              <Input
                id="activity-due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
