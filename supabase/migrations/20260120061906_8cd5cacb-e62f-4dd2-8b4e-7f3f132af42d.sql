-- Add from_bom column to project_cost_items table
ALTER TABLE public.project_cost_items 
ADD COLUMN IF NOT EXISTS from_bom BOOLEAN NOT NULL DEFAULT false;