-- Add sample admin user role
INSERT INTO public.user_roles (user_id, organization_id, role) 
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Mock user ID
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Organization ID
  'admin'
) ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Add another sample user
INSERT INTO public.user_roles (user_id, organization_id, role) 
VALUES (
  'b2c3d4e5-f6g7-8901-bcde-f12345678901', -- Mock user ID 2
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Organization ID
  'user'
) ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Update sample profiles to match
UPDATE public.profiles 
SET organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    company_name = 'Premier Homes Australia',
    contact_person = 'John Smith',
    phone = '02 9876 5432'
WHERE user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Insert additional profile if needed
INSERT INTO public.profiles (user_id, organization_id, company_name, contact_person, phone)
VALUES (
  'b2c3d4e5-f6g7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Premier Homes Australia',
  'Sarah Johnson',
  '04 1234 5678'
) ON CONFLICT (user_id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  company_name = EXCLUDED.company_name,
  contact_person = EXCLUDED.contact_person,
  phone = EXCLUDED.phone;