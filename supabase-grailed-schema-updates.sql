-- Additional schema updates for Grailed-like features
-- Run this in Supabase SQL Editor

-- Add brand, size, condition columns to listings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'listings' 
    AND column_name = 'brand'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN brand TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'listings' 
    AND column_name = 'size'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN size TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'listings' 
    AND column_name = 'condition'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN condition TEXT;
  END IF;
END $$;

-- Add constraint for condition enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'listings_condition_check'
  ) THEN
    ALTER TABLE public.listings ADD CONSTRAINT listings_condition_check 
      CHECK (condition IS NULL OR condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor'));
  END IF;
END $$;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_brand ON public.listings(brand);
CREATE INDEX IF NOT EXISTS idx_listings_size ON public.listings(size);
CREATE INDEX IF NOT EXISTS idx_listings_condition ON public.listings(condition);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

-- Full text search index for title and description
CREATE INDEX IF NOT EXISTS idx_listings_text_search ON public.listings USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';