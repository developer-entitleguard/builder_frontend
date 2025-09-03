-- Create a user role entry for the current authenticated user if they don't have one
-- This will be run dynamically when users log in

-- First, ensure the authenticated user has a profile
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void AS $$
BEGIN
  -- Insert profile for authenticated user if it doesn't exist
  INSERT INTO public.profiles (user_id, organization_id, company_name, contact_person)
  SELECT 
    auth.uid(),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Premier Homes Australia',
    COALESCE(auth.jwt() ->> 'email', 'User')
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
  );

  -- Insert admin role for authenticated user if they don't have one
  INSERT INTO public.user_roles (user_id, organization_id, role)
  SELECT 
    auth.uid(),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin'
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;