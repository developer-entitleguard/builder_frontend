-- Allow public access to approval requests via their unique token
CREATE POLICY "Public can view approval by token"
ON public.approval_requests
FOR SELECT
USING (approval_token IS NOT NULL);

-- Allow public to update approval status via token (for approve/reject)
CREATE POLICY "Public can respond to approval via token"
ON public.approval_requests
FOR UPDATE
USING (approval_token IS NOT NULL AND status = 'pending');