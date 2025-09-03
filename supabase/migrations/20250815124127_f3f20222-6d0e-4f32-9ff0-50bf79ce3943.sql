-- Restructure user/organization system (Final fixed version)
-- Organizations are primary, each has a contact user, organizations can add multiple users

-- First, drop all dependent policies
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can view their organization" ON public.builder_organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.builder_organizations;

-- Handle user_roles constraints properly
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_organization_id_key,
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Add new constraint: one user can only belong to one organization
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Add new columns to builder_organizations
ALTER TABLE public.builder_organizations 
ADD COLUMN IF NOT EXISTS contact_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Update the profiles table structure
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS organization_id CASCADE,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS password_set_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- Create/update function to get user's organization
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

-- Create new RLS policies for builder_organizations
CREATE POLICY "Users can view their organization" 
ON public.builder_organizations 
FOR SELECT 
USING (id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can update their organization" 
ON public.builder_organizations 
FOR UPDATE 
USING (id = get_user_organization(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Create new RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

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

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

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

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Insert profile for authenticated user if it doesn't exist
  INSERT INTO public.profiles (user_id, contact_person, company_name)
  SELECT 
    auth.uid(),
    COALESCE(auth.jwt() ->> 'contact_person', auth.jwt() ->> 'email', 'User'),
    COALESCE(auth.jwt() ->> 'company_name', 'New Organization')
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
  );
END;
$$;