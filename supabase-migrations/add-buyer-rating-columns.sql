-- Add columns so sellers can rate buyers (1-5 stars + optional review)
-- Run this in Supabase SQL Editor if your transactions table doesn't have these yet.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS buyer_rating_by_seller INTEGER CHECK (buyer_rating_by_seller >= 1 AND buyer_rating_by_seller <= 5),
  ADD COLUMN IF NOT EXISTS buyer_review_by_seller TEXT;

COMMENT ON COLUMN public.transactions.buyer_rating_by_seller IS 'Seller rates the buyer 1-5 after sale';
COMMENT ON COLUMN public.transactions.buyer_review_by_seller IS 'Optional seller review of the buyer/experience';
