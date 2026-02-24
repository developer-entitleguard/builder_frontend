-- Add new columns to approval_requests table
ALTER TABLE public.approval_requests
ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES public.homeowner_registrations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_type text NOT NULL DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS approver_name text,
ADD COLUMN IF NOT EXISTS approver_email text,
ADD COLUMN IF NOT EXISTS due_by date,
ADD COLUMN IF NOT EXISTS decision_comment text;

-- Rename columns for consistency
ALTER TABLE public.approval_requests 
RENAME COLUMN response_notes TO decision_comment_old;

-- Drop the old column after data migration (if any)
ALTER TABLE public.approval_requests DROP COLUMN IF EXISTS decision_comment_old;

-- Update existing responded_at to decided_at for clarity
ALTER TABLE public.approval_requests 
RENAME COLUMN responded_at TO decided_at;

ALTER TABLE public.approval_requests 
RENAME COLUMN responded_by TO decided_by;

-- Add check constraint for approval_type
ALTER TABLE public.approval_requests
ADD CONSTRAINT approval_requests_type_check 
CHECK (approval_type IN ('Scope Change', 'Variation', 'Material Change', 'Schedule Change', 'Payment Milestone', 'Other'));

-- Add check constraint for status (add Cancelled)
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE public.approval_requests
ADD CONSTRAINT approval_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Add approval_token for email-based approval
ALTER TABLE public.approval_requests
ADD COLUMN IF NOT EXISTS approval_token text UNIQUE;

-- Create index for registration_id lookups
CREATE INDEX IF NOT EXISTS idx_approval_requests_registration_id ON public.approval_requests(registration_id);

-- Create index for approval_type filtering
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON public.approval_requests(approval_type);