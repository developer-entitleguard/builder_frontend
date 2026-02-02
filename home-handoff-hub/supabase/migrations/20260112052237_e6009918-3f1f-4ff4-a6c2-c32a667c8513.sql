-- Drop the existing check constraint first
ALTER TABLE public.project_activities DROP CONSTRAINT IF EXISTS project_activities_status_check;