-- Stripe-related schema updates (safe to run multiple times)
-- Run this in Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE public.transactions
      ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi
  ON public.transactions(stripe_payment_intent_id);

NOTIFY pgrst, 'reload schema';

