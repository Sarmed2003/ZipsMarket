-- Category and Username Schema Updates
-- Run this in Supabase SQL Editor

-- Add category column to listings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'listings' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN category TEXT;
    -- Add constraint to ensure valid categories
    ALTER TABLE public.listings ADD CONSTRAINT listings_category_check 
      CHECK (category IS NULL OR category IN ('Menswear', 'Womenswear', 'sneakers', 'College Items', 'accessories'));
  END IF;
END $$;

-- Add username column to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
    -- Create index for faster username lookups
    CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
  END IF;
END $$;

-- Create function to check username uniqueness (already handled by UNIQUE constraint, but good to have)
-- The UNIQUE constraint will automatically prevent duplicate usernames
