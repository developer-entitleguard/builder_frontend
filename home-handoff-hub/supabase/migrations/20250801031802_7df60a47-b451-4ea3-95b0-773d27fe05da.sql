-- Add settlement date to homeowner registrations
ALTER TABLE public.homeowner_registrations 
ADD COLUMN settlement_date DATE;

-- Create builder items table for master item list
CREATE TABLE public.builder_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  make TEXT,
  brand TEXT,
  model TEXT,
  documentation_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on builder items
ALTER TABLE public.builder_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for builder items
CREATE POLICY "Builders can view their own items" 
ON public.builder_items 
FOR SELECT 
USING (auth.uid() = builder_id);

CREATE POLICY "Builders can create their own items" 
ON public.builder_items 
FOR INSERT 
WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Builders can update their own items" 
ON public.builder_items 
FOR UPDATE 
USING (auth.uid() = builder_id);

CREATE POLICY "Builders can delete their own items" 
ON public.builder_items 
FOR DELETE 
USING (auth.uid() = builder_id);

-- Create homeowner queries table
CREATE TABLE public.homeowner_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.homeowner_registrations(id) ON DELETE CASCADE,
  builder_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on homeowner queries
ALTER TABLE public.homeowner_queries ENABLE ROW LEVEL SECURITY;

-- RLS policies for homeowner queries
CREATE POLICY "Builders can view queries for their registrations" 
ON public.homeowner_queries 
FOR SELECT 
USING (auth.uid() = builder_id);

CREATE POLICY "Anyone can create queries" 
ON public.homeowner_queries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Builders can update queries for their registrations" 
ON public.homeowner_queries 
FOR UPDATE 
USING (auth.uid() = builder_id);

-- Add update triggers for timestamps
CREATE TRIGGER update_builder_items_updated_at
BEFORE UPDATE ON public.builder_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homeowner_queries_updated_at
BEFORE UPDATE ON public.homeowner_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();