-- Fix RLS Performance Issues and Ensure Public Listings Visibility
-- Run this in Supabase SQL Editor

-- Drop and recreate profiles policies with performance optimization
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- Drop and recreate listings policies with performance optimization
DROP POLICY IF EXISTS "Anyone can view listings" ON public.listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;

-- CRITICAL: Anyone can view listings (must be first)
CREATE POLICY "Anyone can view listings"
  ON public.listings FOR SELECT
  USING (true);

CREATE POLICY "Users can create listings"
  ON public.listings FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Drop and recreate transactions policies with performance optimization
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id);

CREATE POLICY "Users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK ((select auth.uid()) = buyer_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id);

-- Drop and recreate messages policies with performance optimization
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING ((select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id);

CREATE POLICY "Users can create messages"
  ON public.messages FOR INSERT
  WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING ((select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id);

-- Verify listings are publicly accessible
-- This query should return all listings for any user
-- SELECT * FROM public.listings;
