-- Add property detail fields to homeowner_registrations
ALTER TABLE public.homeowner_registrations
ADD COLUMN num_bedrooms integer,
ADD COLUMN num_rooms integer,
ADD COLUMN total_built_up_area numeric;