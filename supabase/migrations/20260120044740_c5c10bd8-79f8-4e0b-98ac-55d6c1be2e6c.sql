-- Create function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'superadmin'
  )
$$;

-- Update RLS policies for builder_organizations to allow superadmin full access
DROP POLICY IF EXISTS "Users can view their organization" ON public.builder_organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.builder_organizations;

CREATE POLICY "Users can view their organization"
ON public.builder_organizations FOR SELECT
USING (
  id = get_user_organization(auth.uid()) 
  OR is_superadmin(auth.uid())
);

CREATE POLICY "Admins can update their organization"
ON public.builder_organizations FOR UPDATE
USING (
  (id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'))
  OR is_superadmin(auth.uid())
);

CREATE POLICY "Superadmins can create organizations"
ON public.builder_organizations FOR INSERT
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete organizations"
ON public.builder_organizations FOR DELETE
USING (is_superadmin(auth.uid()));

-- Update user_roles policies to allow superadmin management
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view organization roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON public.user_roles;

CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view organization roles"
ON public.user_roles FOR SELECT
USING (
  (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'))
  OR is_superadmin(auth.uid())
);

CREATE POLICY "Admins can manage roles in their organization"
ON public.user_roles FOR ALL
USING (
  (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'))
  OR is_superadmin(auth.uid())
);

-- Update profiles policies for superadmin access
DROP POLICY IF EXISTS "Admins can view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;

CREATE POLICY "Admins can view organization profiles"
ON public.profiles FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM user_roles ur1, user_roles ur2
    WHERE ur1.user_id = auth.uid() 
    AND ur2.user_id = profiles.user_id 
    AND ur1.organization_id = ur2.organization_id
  ))
  OR is_superadmin(auth.uid())
);

CREATE POLICY "Admins can update organization profiles"
ON public.profiles FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM user_roles ur1, user_roles ur2
    WHERE ur1.user_id = auth.uid() 
    AND ur2.user_id = profiles.user_id 
    AND ur1.organization_id = ur2.organization_id
  ))
  OR is_superadmin(auth.uid())
);

-- Update projects RLS policies
DROP POLICY IF EXISTS "Users can view organization projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create organization projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update organization projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete organization projects" ON public.projects;

CREATE POLICY "Users can view organization projects"
ON public.projects FOR SELECT
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can create organization projects"
ON public.projects FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can update organization projects"
ON public.projects FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Admins can delete organization projects"
ON public.projects FOR DELETE
USING ((organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin')) OR is_superadmin(auth.uid()));

-- Update homeowner_registrations RLS policies
DROP POLICY IF EXISTS "Users can view organization registrations" ON public.homeowner_registrations;
DROP POLICY IF EXISTS "Users can create organization registrations" ON public.homeowner_registrations;
DROP POLICY IF EXISTS "Users can update organization registrations" ON public.homeowner_registrations;
DROP POLICY IF EXISTS "Admins can delete organization registrations" ON public.homeowner_registrations;

CREATE POLICY "Users can view organization registrations"
ON public.homeowner_registrations FOR SELECT
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can create organization registrations"
ON public.homeowner_registrations FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can update organization registrations"
ON public.homeowner_registrations FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Admins can delete organization registrations"
ON public.homeowner_registrations FOR DELETE
USING ((organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin')) OR is_superadmin(auth.uid()));

-- Update remaining table policies for superadmin access
-- project_activities
DROP POLICY IF EXISTS "Users can view organization activities" ON public.project_activities;
DROP POLICY IF EXISTS "Users can create organization activities" ON public.project_activities;
DROP POLICY IF EXISTS "Users can update organization activities" ON public.project_activities;
DROP POLICY IF EXISTS "Admins can delete organization activities" ON public.project_activities;

CREATE POLICY "Users can view organization activities"
ON public.project_activities FOR SELECT
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can create organization activities"
ON public.project_activities FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can update organization activities"
ON public.project_activities FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Admins can delete organization activities"
ON public.project_activities FOR DELETE
USING ((organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin')) OR is_superadmin(auth.uid()));

-- builder_items
DROP POLICY IF EXISTS "Users can view organization items" ON public.builder_items;
DROP POLICY IF EXISTS "Users can create organization items" ON public.builder_items;
DROP POLICY IF EXISTS "Users can update organization items" ON public.builder_items;
DROP POLICY IF EXISTS "Admins can delete organization items" ON public.builder_items;

CREATE POLICY "Users can view organization items"
ON public.builder_items FOR SELECT
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can create organization items"
ON public.builder_items FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can update organization items"
ON public.builder_items FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Admins can delete organization items"
ON public.builder_items FOR DELETE
USING ((organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin')) OR is_superadmin(auth.uid()));

-- bill_of_materials
DROP POLICY IF EXISTS "Users can view organization BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Users can create organization BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Users can update organization BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Admins can delete organization BOMs" ON public.bill_of_materials;

CREATE POLICY "Users can view organization BOMs"
ON public.bill_of_materials FOR SELECT
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can create organization BOMs"
ON public.bill_of_materials FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Users can update organization BOMs"
ON public.bill_of_materials FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Admins can delete organization BOMs"
ON public.bill_of_materials FOR DELETE
USING ((organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin')) OR is_superadmin(auth.uid()));