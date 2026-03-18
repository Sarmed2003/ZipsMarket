-- Add Stripe Connect columns to profiles table.
-- Each seller needs a connected Stripe Express account for payouts.
--
-- Run ONCE in Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Update the complete schema's NOTIFY so PostgREST picks up the new columns
NOTIFY pgrst, 'reload schema';
