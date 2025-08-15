-- Restructure user/organization system
-- Organizations are primary, each has a contact user, organizations can add multiple users

-- First, let's modify the builder_organizations table to include contact user info
ALTER TABLE public.builder_organizations 
ADD COLUMN contact_user_id uuid REFERENCES auth.users(id),
ADD COLUMN status text DEFAULT 'active',
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update the profiles table to be simpler and focused on user info
-- Remove organization_id as users will be linked via user_roles only
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS organization_id,
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN status text DEFAULT 'active',
ADD COLUMN password_set_at timestamp with time zone,
ADD COLUMN last_login_at timestamp with time zone;

-- Update user_roles to be the single source of truth for user-org relationships
-- Add constraint to ensure one user can only belong to one organization
DROP INDEX IF EXISTS user_roles_user_id_organization_id_key;
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key,
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Create function to get user's organization (updated)
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update RLS policies for builder_organizations
DROP POLICY IF EXISTS "Only admins can view their organization" ON public.builder_organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.builder_organizations;

-- Users can view their organization details
CREATE POLICY "Users can view their organization" 
ON public.builder_organizations 
FOR SELECT 
USING (id = get_user_organization(auth.uid()));

-- Only admins can update organization details
CREATE POLICY "Admins can update their organization" 
ON public.builder_organizations 
FOR UPDATE 
USING (id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Only admins can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all profiles in their organization
CREATE POLICY "Admins can view organization profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur1, public.user_roles ur2 
    WHERE ur1.user_id = auth.uid() 
    AND ur2.user_id = profiles.user_id 
    AND ur1.organization_id = ur2.organization_id
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can update profiles in their organization
CREATE POLICY "Admins can update organization profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur1, public.user_roles ur2 
    WHERE ur1.user_id = auth.uid() 
    AND ur2.user_id = profiles.user_id 
    AND ur1.organization_id = ur2.organization_id
  )
);

-- Update ensure_user_profile function to work with new structure
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_org_id uuid;
BEGIN
  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()) THEN
    RETURN;
  END IF;

  -- Get user's organization if they have one
  SELECT organization_id INTO user_org_id 
  FROM public.user_roles 
  WHERE user_id = auth.uid();

  -- If user doesn't have an organization, they might be a new organization contact
  -- Create profile with basic info
  INSERT INTO public.profiles (user_id, contact_person, company_name)
  SELECT 
    auth.uid(),
    COALESCE(auth.jwt() ->> 'contact_person', auth.jwt() ->> 'email', 'User'),
    COALESCE(auth.jwt() ->> 'company_name', 'New Organization')
  WHERE auth.uid() IS NOT NULL;
END;
$$;