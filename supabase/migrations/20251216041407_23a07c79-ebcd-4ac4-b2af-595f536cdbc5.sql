-- Drop the overly permissive "No public access" policies that weaken security
-- The existing builder_id checks already properly restrict access

DROP POLICY IF EXISTS "No public access" ON public.homeowner_registrations;
DROP POLICY IF EXISTS "No public access" ON public.bill_of_materials;