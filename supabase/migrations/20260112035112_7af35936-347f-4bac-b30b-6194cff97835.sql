-- Create table for project pricing snapshots
CREATE TABLE public.project_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_id UUID NOT NULL,
  total_estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  buffer_percentage NUMERIC(5,2) DEFAULT 0,
  buffer_amount NUMERIC(12,2) DEFAULT 0,
  margin_percentage NUMERIC(5,2) DEFAULT 0,
  margin_amount NUMERIC(12,2) DEFAULT 0,
  final_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for cost line items
CREATE TABLE public.project_cost_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pricing_id UUID NOT NULL REFERENCES public.project_pricing(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('materials', 'labour', 'subcontractors', 'overheads')),
  name TEXT NOT NULL,
  description TEXT,
  unit_rate NUMERIC(12,2),
  quantity NUMERIC(10,2) DEFAULT 1,
  total_cost NUMERIC(12,2) NOT NULL,
  linked_activity_id UUID REFERENCES public.project_activities(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT true,
  is_modified BOOLEAN NOT NULL DEFAULT false,
  ai_assumptions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_cost_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_pricing
CREATE POLICY "Users can view their own project pricing"
ON public.project_pricing
FOR SELECT
USING (auth.uid() = builder_id);

CREATE POLICY "Users can create their own project pricing"
ON public.project_pricing
FOR INSERT
WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Users can update their own project pricing"
ON public.project_pricing
FOR UPDATE
USING (auth.uid() = builder_id);

CREATE POLICY "Users can delete their own project pricing"
ON public.project_pricing
FOR DELETE
USING (auth.uid() = builder_id);

-- RLS policies for project_cost_items (via pricing ownership)
CREATE POLICY "Users can view cost items for their pricing"
ON public.project_cost_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.project_pricing 
  WHERE id = pricing_id AND builder_id = auth.uid()
));

CREATE POLICY "Users can create cost items for their pricing"
ON public.project_cost_items
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_pricing 
  WHERE id = pricing_id AND builder_id = auth.uid()
));

CREATE POLICY "Users can update cost items for their pricing"
ON public.project_cost_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.project_pricing 
  WHERE id = pricing_id AND builder_id = auth.uid()
));

CREATE POLICY "Users can delete cost items for their pricing"
ON public.project_cost_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.project_pricing 
  WHERE id = pricing_id AND builder_id = auth.uid()
));

-- Trigger for updating timestamps
CREATE TRIGGER update_project_pricing_updated_at
BEFORE UPDATE ON public.project_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_cost_items_updated_at
BEFORE UPDATE ON public.project_cost_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();