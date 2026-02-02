-- Add policy to explicitly deny anonymous/public access to bill_of_materials
CREATE POLICY "No public access" 
ON public.bill_of_materials 
FOR SELECT 
USING (auth.uid() IS NOT NULL);