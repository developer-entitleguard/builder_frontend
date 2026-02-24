-- Add superadmin to app_role enum (must be done in separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';