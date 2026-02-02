-- Allow NULL organization_id for superadmins
ALTER TABLE public.user_roles 
ALTER COLUMN organization_id DROP NOT NULL;

-- Update the existing superadmin record to have NULL organization_id
UPDATE public.user_roles 
SET organization_id = NULL 
WHERE user_id = 'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33' 
  AND role = 'superadmin';

-- Delete the System Administration organization as it's no longer needed
DELETE FROM public.builder_organizations 
WHERE name = 'System Administration';

-- Add a check constraint to ensure non-superadmin roles must have an organization_id
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_org_required_for_non_superadmin
CHECK (
  (role = 'superadmin' AND organization_id IS NULL) OR
  (role != 'superadmin' AND organization_id IS NOT NULL)
);