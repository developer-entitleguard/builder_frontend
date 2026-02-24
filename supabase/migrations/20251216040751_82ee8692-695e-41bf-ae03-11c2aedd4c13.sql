-- Add policy to explicitly deny anonymous/public access to homeowner_registrations
CREATE POLICY "No public access" 
ON public.homeowner_registrations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);