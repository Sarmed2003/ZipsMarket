-- Add five_star_count to seller_ratings so the profile can show it directly.
-- Run ONCE in Supabase SQL Editor.

ALTER TABLE public.seller_ratings
  ADD COLUMN IF NOT EXISTS five_star_count INTEGER DEFAULT 0 NOT NULL;

-- Backfill from existing transaction ratings
UPDATE public.seller_ratings sr
SET five_star_count = (
  SELECT COUNT(*)
  FROM public.transactions t
  WHERE t.seller_id = sr.seller_id
    AND t.rating = 5
);
