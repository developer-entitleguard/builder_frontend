-- Ensure only admins can view organization details
DROP POLICY IF EXISTS "Users can view their organization" ON public.builder_organizations;

CREATE POLICY "Only admins can view their organization" 
ON public.builder_organizations 
FOR SELECT 
USING ((id = get_user_organization(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

-- Ensure only admins can view profiles in their organization
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

CREATE POLICY "Only admins can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING ((organization_id = get_user_organization(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

-- Ensure only admins can view roles in their organization  
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;

CREATE POLICY "Only admins can view roles in their organization" 
ON public.user_roles 
FOR SELECT 
USING ((organization_id = get_user_organization(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));