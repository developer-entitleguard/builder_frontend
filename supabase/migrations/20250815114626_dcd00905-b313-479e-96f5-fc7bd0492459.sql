-- Fix security issue: Replace overly permissive query creation policy
-- The current policy allows anyone to create queries without verification
-- This could potentially be exploited to probe customer registration data

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can create queries" ON public.homeowner_queries;

-- Create a more secure policy that requires verification
-- Users can only create queries if they provide the correct customer email for the registration
CREATE POLICY "Verified homeowners can create queries" 
ON public.homeowner_queries 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.homeowner_registrations 
    WHERE id = registration_id 
    AND customer_email = current_setting('request.jwt.claims', true)::json->>'customer_email'
  )
);

-- Alternative approach: Create a more restrictive policy that requires authentication
-- This ensures only authenticated users (builders) can create queries on behalf of homeowners
CREATE POLICY "Only builders can create queries" 
ON public.homeowner_queries 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = builder_id
  AND EXISTS (
    SELECT 1 
    FROM public.homeowner_registrations 
    WHERE id = registration_id 
    AND builder_id = auth.uid()
  )
);