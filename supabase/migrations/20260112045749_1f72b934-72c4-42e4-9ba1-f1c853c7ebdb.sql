-- Add price column to homeowner_registrations
ALTER TABLE public.homeowner_registrations
ADD COLUMN price numeric NULL;