-- Add purchaser field to builder_items table
ALTER TABLE public.builder_items 
ADD COLUMN purchaser text;