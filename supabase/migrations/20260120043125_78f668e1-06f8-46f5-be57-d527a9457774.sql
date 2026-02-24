-- Purge all data from tables (child tables first, then parent tables)

-- Delete activity-related data
DELETE FROM public.activity_updates;
DELETE FROM public.approval_requests;
DELETE FROM public.project_activities;

-- Delete project pricing data
DELETE FROM public.project_cost_items;
DELETE FROM public.project_pricing;

-- Delete homeowner-related data
DELETE FROM public.homeowner_queries;
DELETE FROM public.homeowner_registrations;

-- Delete items and BOMs
DELETE FROM public.builder_items;
DELETE FROM public.bill_of_materials;

-- Delete projects
DELETE FROM public.projects;

-- Delete organization-related data
DELETE FROM public.vendors;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM public.builder_organizations;