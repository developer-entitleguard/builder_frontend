-- Add consent fields to homeowner_registrations
ALTER TABLE public.homeowner_registrations
ADD COLUMN consent_received boolean DEFAULT false,
ADD COLUMN consent_received_at timestamp with time zone,
ADD COLUMN consent_method text,
ADD COLUMN consent_token text UNIQUE;

-- Create index for consent token lookups
CREATE INDEX idx_homeowner_registrations_consent_token ON public.homeowner_registrations(consent_token) WHERE consent_token IS NOT NULL;