-- =============================================
-- MULTI-TENANCY IMPLEMENTATION
-- =============================================

-- 1. Add organization_id to tables that need organization-scoping
-- =============================================

-- Projects table
ALTER TABLE public.projects 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Homeowner registrations
ALTER TABLE public.homeowner_registrations 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Project activities
ALTER TABLE public.project_activities 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Bill of materials
ALTER TABLE public.bill_of_materials 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Builder items
ALTER TABLE public.builder_items 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Approval requests
ALTER TABLE public.approval_requests 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Activity updates
ALTER TABLE public.activity_updates 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Homeowner queries
ALTER TABLE public.homeowner_queries 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- Project pricing
ALTER TABLE public.project_pricing 
ADD COLUMN organization_id uuid REFERENCES public.builder_organizations(id) ON DELETE CASCADE;

-- 2. Create helper function for checking organization membership
-- =============================================

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
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
      AND organization_id = _org_id
  )
$$;

-- 3. Drop existing RLS policies and create organization-based ones
-- =============================================

-- PROJECTS
DROP POLICY IF EXISTS "Builders can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Builders can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Builders can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Builders can delete their own projects" ON public.projects;

CREATE POLICY "Users can view organization projects" 
ON public.projects FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization projects" 
ON public.projects FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization projects" 
ON public.projects FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can delete organization projects" 
ON public.projects FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- HOMEOWNER REGISTRATIONS
DROP POLICY IF EXISTS "Builders can view their own registrations" ON public.homeowner_registrations;
DROP POLICY IF EXISTS "Builders can create their own registrations" ON public.homeowner_registrations;
DROP POLICY IF EXISTS "Builders can update their own registrations" ON public.homeowner_registrations;
DROP POLICY IF EXISTS "Builders can delete their own registrations" ON public.homeowner_registrations;

CREATE POLICY "Users can view organization registrations" 
ON public.homeowner_registrations FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization registrations" 
ON public.homeowner_registrations FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization registrations" 
ON public.homeowner_registrations FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can delete organization registrations" 
ON public.homeowner_registrations FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- PROJECT ACTIVITIES
DROP POLICY IF EXISTS "Builders can view their own activities" ON public.project_activities;
DROP POLICY IF EXISTS "Builders can create their own activities" ON public.project_activities;
DROP POLICY IF EXISTS "Builders can update their own activities" ON public.project_activities;
DROP POLICY IF EXISTS "Builders can delete their own activities" ON public.project_activities;

CREATE POLICY "Users can view organization activities" 
ON public.project_activities FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization activities" 
ON public.project_activities FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization activities" 
ON public.project_activities FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can delete organization activities" 
ON public.project_activities FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- BILL OF MATERIALS
DROP POLICY IF EXISTS "Builders can view their own BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Builders can create their own BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Builders can update their own BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Builders can delete their own BOMs" ON public.bill_of_materials;

CREATE POLICY "Users can view organization BOMs" 
ON public.bill_of_materials FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization BOMs" 
ON public.bill_of_materials FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization BOMs" 
ON public.bill_of_materials FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can delete organization BOMs" 
ON public.bill_of_materials FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- BUILDER ITEMS
DROP POLICY IF EXISTS "Builders can view their own items" ON public.builder_items;
DROP POLICY IF EXISTS "Builders can create their own items" ON public.builder_items;
DROP POLICY IF EXISTS "Builders can update their own items" ON public.builder_items;
DROP POLICY IF EXISTS "Builders can delete their own items" ON public.builder_items;

CREATE POLICY "Users can view organization items" 
ON public.builder_items FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization items" 
ON public.builder_items FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization items" 
ON public.builder_items FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can delete organization items" 
ON public.builder_items FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- APPROVAL REQUESTS
DROP POLICY IF EXISTS "Builders can view their own approvals" ON public.approval_requests;
DROP POLICY IF EXISTS "Builders can create their own approvals" ON public.approval_requests;
DROP POLICY IF EXISTS "Builders can update their own approvals" ON public.approval_requests;

CREATE POLICY "Users can view organization approvals" 
ON public.approval_requests FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization approvals" 
ON public.approval_requests FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization approvals" 
ON public.approval_requests FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can delete organization approvals" 
ON public.approval_requests FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- ACTIVITY UPDATES
DROP POLICY IF EXISTS "Builders can view their own updates" ON public.activity_updates;
DROP POLICY IF EXISTS "Builders can create their own updates" ON public.activity_updates;
DROP POLICY IF EXISTS "Builders can delete their own updates" ON public.activity_updates;

CREATE POLICY "Users can view organization updates" 
ON public.activity_updates FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization updates" 
ON public.activity_updates FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update their own updates" 
ON public.activity_updates FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()) AND builder_id = auth.uid());

CREATE POLICY "Users can delete their own updates" 
ON public.activity_updates FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND builder_id = auth.uid());

-- HOMEOWNER QUERIES
DROP POLICY IF EXISTS "Builders can view queries for their registrations" ON public.homeowner_queries;
DROP POLICY IF EXISTS "Builders can update queries for their registrations" ON public.homeowner_queries;
DROP POLICY IF EXISTS "Only builders can create queries" ON public.homeowner_queries;
DROP POLICY IF EXISTS "Verified homeowners can create queries" ON public.homeowner_queries;

CREATE POLICY "Users can view organization queries" 
ON public.homeowner_queries FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization queries" 
ON public.homeowner_queries FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization queries" 
ON public.homeowner_queries FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

-- PROJECT PRICING
DROP POLICY IF EXISTS "Users can view their own project pricing" ON public.project_pricing;
DROP POLICY IF EXISTS "Users can create their own project pricing" ON public.project_pricing;
DROP POLICY IF EXISTS "Users can update their own project pricing" ON public.project_pricing;
DROP POLICY IF EXISTS "Users can delete their own project pricing" ON public.project_pricing;

CREATE POLICY "Users can view organization pricing" 
ON public.project_pricing FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create organization pricing" 
ON public.project_pricing FOR INSERT 
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update organization pricing" 
ON public.project_pricing FOR UPDATE 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can delete organization pricing" 
ON public.project_pricing FOR DELETE 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- PROJECT COST ITEMS (uses pricing_id reference, update to org-based)
DROP POLICY IF EXISTS "Users can view cost items for their pricing" ON public.project_cost_items;
DROP POLICY IF EXISTS "Users can create cost items for their pricing" ON public.project_cost_items;
DROP POLICY IF EXISTS "Users can update cost items for their pricing" ON public.project_cost_items;
DROP POLICY IF EXISTS "Users can delete cost items for their pricing" ON public.project_cost_items;

CREATE POLICY "Users can view organization cost items" 
ON public.project_cost_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.project_pricing pp 
  WHERE pp.id = project_cost_items.pricing_id 
  AND pp.organization_id = get_user_organization(auth.uid())
));

CREATE POLICY "Users can create organization cost items" 
ON public.project_cost_items FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_pricing pp 
  WHERE pp.id = project_cost_items.pricing_id 
  AND pp.organization_id = get_user_organization(auth.uid())
));

CREATE POLICY "Users can update organization cost items" 
ON public.project_cost_items FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.project_pricing pp 
  WHERE pp.id = project_cost_items.pricing_id 
  AND pp.organization_id = get_user_organization(auth.uid())
));

CREATE POLICY "Admins can delete organization cost items" 
ON public.project_cost_items FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.project_pricing pp 
  WHERE pp.id = project_cost_items.pricing_id 
  AND pp.organization_id = get_user_organization(auth.uid())
) AND has_role(auth.uid(), 'admin'));

-- 4. Update user_roles policies to allow users to see their own role
-- =============================================

DROP POLICY IF EXISTS "Only admins can view roles in their organization" ON public.user_roles;

CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view organization roles" 
ON public.user_roles FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'));