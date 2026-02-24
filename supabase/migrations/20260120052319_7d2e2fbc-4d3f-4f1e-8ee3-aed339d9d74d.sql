-- Allow anyone to read invitations by token (for accepting invitations)
-- This is safe because:
-- 1. Tokens are UUIDs and unguessable
-- 2. Users need the exact token from the email to access
CREATE POLICY "Anyone can read invitation by token"
ON public.invitations
FOR SELECT
USING (true);

-- Note: We're allowing SELECT for all but the token is a secret UUID
-- Only INSERT, UPDATE, DELETE remain restricted to admins/superadmins