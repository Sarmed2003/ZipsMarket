-- Fix: seller_ratings table was missing INSERT and UPDATE RLS policies.
--
-- Without these policies, authenticated buyers get:
--   "new row violates row-level security policy for table 'seller_ratings'"
-- when trying to save their rating, which also means:
--   - capture-payment never runs (funds stay on hold)
--   - transaction status stays 'paid' (badge stays "Pending Rating")
--   - profile Seller Rating never updates
--
-- Run ONCE in Supabase SQL Editor.

-- Drop any existing versions first to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can insert seller ratings" ON public.seller_ratings;
DROP POLICY IF EXISTS "Authenticated users can update seller ratings" ON public.seller_ratings;

-- Allow any authenticated user to INSERT a seller rating row
-- (the buyer writes a new aggregate row for a seller they've never rated before)
CREATE POLICY "Authenticated users can insert seller ratings"
  ON public.seller_ratings
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- Allow any authenticated user to UPDATE a seller rating row
-- (subsequent ratings update the aggregate average + count for that seller)
CREATE POLICY "Authenticated users can update seller ratings"
  ON public.seller_ratings
  FOR UPDATE
  USING ((select auth.role()) = 'authenticated');

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
