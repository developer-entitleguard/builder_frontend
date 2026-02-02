-- Add percentage_complete column to project_activities
ALTER TABLE public.project_activities
ADD COLUMN percentage_complete integer DEFAULT 0 CHECK (percentage_complete >= 0 AND percentage_complete <= 100);