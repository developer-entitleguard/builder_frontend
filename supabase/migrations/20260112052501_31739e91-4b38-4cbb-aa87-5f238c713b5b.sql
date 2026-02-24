-- Update the default status value for new activities
ALTER TABLE public.project_activities ALTER COLUMN status SET DEFAULT 'pending';