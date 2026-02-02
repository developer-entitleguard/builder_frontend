-- First create a system organization for superadmins
INSERT INTO public.builder_organizations (name, address, contact_email, contact_phone, status, description)
VALUES ('System Administration', 'N/A', 'admin@entitleguard.com', '0000000000', 'active', 'System organization for superadmin users')
ON CONFLICT DO NOTHING;

-- Now make venki@entitleguard.com a superadmin
INSERT INTO public.user_roles (user_id, role, organization_id)
SELECT 
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33'::uuid,
  'superadmin'::app_role,
  id
FROM public.builder_organizations 
WHERE name = 'System Administration'
LIMIT 1;