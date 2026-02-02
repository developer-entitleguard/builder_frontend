-- Add warranty_years column to builder_items table
ALTER TABLE public.builder_items 
ADD COLUMN warranty_years integer DEFAULT NULL;

-- Add manual_url column to store manual document URL for BOM items
ALTER TABLE public.builder_items 
ADD COLUMN manual_url text DEFAULT NULL;

COMMENT ON COLUMN public.builder_items.warranty_years IS 'Warranty duration in years for the item';
COMMENT ON COLUMN public.builder_items.manual_url IS 'URL to the manual document for this item';