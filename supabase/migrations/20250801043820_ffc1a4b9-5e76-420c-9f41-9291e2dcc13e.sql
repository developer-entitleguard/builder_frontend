-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create builder_organizations table
CREATE TABLE public.builder_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  abn TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.builder_organizations ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.builder_organizations(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Organization policies
CREATE POLICY "Users can view their organization" 
ON public.builder_organizations 
FOR SELECT 
USING (id = public.get_user_organization(auth.uid()));

CREATE POLICY "Admins can update their organization" 
ON public.builder_organizations 
FOR UPDATE 
USING (id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view roles in their organization" 
ON public.user_roles 
FOR SELECT 
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Admins can manage roles in their organization" 
ON public.user_roles 
FOR ALL 
USING (organization_id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Update profiles table to include organization reference
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.builder_organizations(id);

-- Update profiles policies to work with organizations
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Admins can update profiles in their organization" 
ON public.profiles 
FOR UPDATE 
USING (organization_id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Add triggers for timestamps
CREATE TRIGGER update_builder_organizations_updated_at
BEFORE UPDATE ON public.builder_organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample organization and admin user
INSERT INTO public.builder_organizations (id, name, address, contact_email, contact_phone, abn, description) 
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Premier Homes Australia',
  '123 Builder Street, Sydney NSW 2000',
  'admin@premierhomes.com.au',
  '02 9876 5432',
  '12345678901',
  'Leading residential construction company specializing in quality homes across Sydney and surrounding areas.'
);

-- Update existing builder items to use organization
UPDATE public.builder_items 
SET builder_id = (
  SELECT user_id FROM public.profiles 
  WHERE profiles.user_id = builder_items.builder_id 
  LIMIT 1
)
WHERE builder_id IS NOT NULL;

-- Update existing registrations to use organization  
UPDATE public.homeowner_registrations 
SET builder_id = (
  SELECT user_id FROM public.profiles 
  WHERE profiles.user_id = homeowner_registrations.builder_id 
  LIMIT 1
)
WHERE builder_id IS NOT NULL;

-- Update existing queries to use organization
UPDATE public.homeowner_queries 
SET builder_id = (
  SELECT user_id FROM public.profiles 
  WHERE profiles.user_id = homeowner_queries.builder_id 
  LIMIT 1
)
WHERE builder_id IS NOT NULL;

-- Update existing profiles to link to organization
UPDATE public.profiles 
SET organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE organization_id IS NULL;