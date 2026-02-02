-- Create bill_of_materials table
CREATE TABLE public.bill_of_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID NOT NULL,
  name TEXT NOT NULL,
  project_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bill_of_materials
CREATE POLICY "Builders can view their own BOMs"
ON public.bill_of_materials
FOR SELECT
USING (auth.uid() = builder_id);

CREATE POLICY "Builders can create their own BOMs"
ON public.bill_of_materials
FOR INSERT
WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Builders can update their own BOMs"
ON public.bill_of_materials
FOR UPDATE
USING (auth.uid() = builder_id);

CREATE POLICY "Builders can delete their own BOMs"
ON public.bill_of_materials
FOR DELETE
USING (auth.uid() = builder_id);

-- Add bom_id to builder_items
ALTER TABLE public.builder_items
ADD COLUMN bom_id UUID REFERENCES public.bill_of_materials(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_bill_of_materials_updated_at
BEFORE UPDATE ON public.bill_of_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();