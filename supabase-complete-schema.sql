-- ========================================
-- ZipsMarket Complete Database Schema
-- Run this ONCE in your Supabase SQL Editor
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLES
-- ========================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  profile_picture TEXT,
  bio TEXT,
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  images TEXT[] DEFAULT '{}',
  category TEXT CHECK (category IS NULL OR category IN ('Menswear', 'Womenswear', 'sneakers', 'College Items', 'accessories')),
  brand TEXT,
  size TEXT,
  condition TEXT CHECK (condition IS NULL OR condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
  sold BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'completed', 'cancelled')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  funds_released BOOLEAN DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  buyer_rating_by_seller INTEGER CHECK (buyer_rating_by_seller IS NULL OR (buyer_rating_by_seller >= 1 AND buyer_rating_by_seller <= 5)),
  buyer_review_by_seller TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seller ratings table (aggregated)
CREATE TABLE IF NOT EXISTS public.seller_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  average_rating DECIMAL(3, 2) NOT NULL,
  total_ratings INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Follows table (user following system)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Likes table (saved favorite items)
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, listing_id)
);

-- Messages table (buyer-seller communication)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ========================================
-- INDEXES (for performance)
-- ========================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Listings
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_brand ON public.listings(brand);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_sold ON public.listings(sold);
CREATE INDEX IF NOT EXISTS idx_listings_text_search ON public.listings USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON public.transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi ON public.transactions(stripe_payment_intent_id);

-- Follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- Likes
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_listing ON public.likes(listing_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON public.messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Listings policies
DROP POLICY IF EXISTS "Anyone can view listings" ON public.listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;

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

-- Transactions policies
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

-- Seller ratings policies
DROP POLICY IF EXISTS "Anyone can view seller ratings" ON public.seller_ratings;
DROP POLICY IF EXISTS "Authenticated users can insert seller ratings" ON public.seller_ratings;
DROP POLICY IF EXISTS "Authenticated users can update seller ratings" ON public.seller_ratings;

CREATE POLICY "Anyone can view seller ratings"
  ON public.seller_ratings FOR SELECT
  USING (true);

-- Buyers need INSERT to create the first rating row for a seller
CREATE POLICY "Authenticated users can insert seller ratings"
  ON public.seller_ratings
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- Buyers need UPDATE to increment the aggregate on subsequent ratings
CREATE POLICY "Authenticated users can update seller ratings"
  ON public.seller_ratings
  FOR UPDATE
  USING ((select auth.role()) = 'authenticated');

-- Follows policies
DROP POLICY IF EXISTS "Users can view all follows" ON public.follows;
DROP POLICY IF EXISTS "Users can create their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

CREATE POLICY "Users can view all follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own follows"
  ON public.follows FOR INSERT
  WITH CHECK ((select auth.uid()) = follower_id);

CREATE POLICY "Users can delete their own follows"
  ON public.follows FOR DELETE
  USING ((select auth.uid()) = follower_id);

-- Likes policies
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

CREATE POLICY "Users can view all likes"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON public.likes FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.likes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Messages policies
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

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Function to automatically create profile on user signup
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

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check email domain (restrict to @uakron.edu)
-- Note: This will be updated in production to remove test email
CREATE OR REPLACE FUNCTION public.check_user_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow test email for development
  IF NEW.email = 'sarmedmahmood91903@gmail.com' THEN
    RETURN NEW;
  END IF;
  
  -- Require @uakron.edu for all other emails
  IF NEW.email NOT LIKE '%@uakron.edu' THEN
    RAISE EXCEPTION 'Only @uakron.edu email addresses are allowed';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to enforce email domain
DROP TRIGGER IF EXISTS check_user_domain_trigger ON auth.users;
CREATE TRIGGER check_user_domain_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_domain();

-- ========================================
-- STORAGE
-- ========================================

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing images
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND (select auth.role()) = 'authenticated');

CREATE POLICY "Users can update own listing images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'listing-images' AND (select auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

NOTIFY pgrst, 'reload schema';

-- ========================================
-- SETUP COMPLETE
-- ========================================
-- Next steps:
-- 1. Copy your anon/public key from Settings → API
-- 2. Add it to .env.local as VITE_SUPABASE_ANON_KEY
-- 3. Run: npm run dev:api
-- 4. Open: http://localhost:3000
