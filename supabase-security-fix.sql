-- Supabase Security Lint Fixes
-- Run this in Supabase SQL Editor (safe to run multiple times).

-- Fix: Function Search Path Mutable (locks search_path for SECURITY DEFINER functions)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email NOT LIKE '%@uakron.edu' THEN
    RAISE EXCEPTION 'Only @uakron.edu email addresses are allowed';
  END IF;
  RETURN NEW;
END;
$$;

-- Optional: reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

