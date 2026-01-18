-- Fix profiles RLS policy for updates
-- Run this in Supabase SQL Editor

-- Drop and recreate profiles update policy to allow updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow users to update their own profile with proper performance optimization
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Verify the policy works
-- You should be able to update your own profile now
