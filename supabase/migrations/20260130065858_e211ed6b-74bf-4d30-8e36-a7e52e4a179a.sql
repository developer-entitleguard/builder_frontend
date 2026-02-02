-- Add column to projects table to control homeowner visibility of activities
ALTER TABLE public.projects 
ADD COLUMN activities_visible_to_homeowner boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.activities_visible_to_homeowner IS 'When true, homeowners linked to this project can see activity progress';