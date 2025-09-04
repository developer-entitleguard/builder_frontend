-- Ensure builder_id is automatically set to the authenticated user on insert to avoid RLS violations
CREATE OR REPLACE FUNCTION public.set_builder_id_on_homeowner_registrations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- If builder_id is not provided, set it to the current authenticated user
  IF NEW.builder_id IS NULL THEN
    NEW.builder_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to apply the function before inserting homeowner_registrations
DROP TRIGGER IF EXISTS trg_set_builder_id_on_homeowner_registrations ON public.homeowner_registrations;
CREATE TRIGGER trg_set_builder_id_on_homeowner_registrations
BEFORE INSERT ON public.homeowner_registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_builder_id_on_homeowner_registrations();