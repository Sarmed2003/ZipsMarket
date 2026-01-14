# Supabase Setup Guide

## Getting Your Supabase Credentials

### Step 1: Access Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and log in
2. You should see your project "ZipsMarket" in the dashboard
3. Click on your project to open it

### Step 2: Get Your Project URL

1. In your Supabase project dashboard, click on **Settings** (gear icon in the left sidebar)
2. Click on **API** in the settings menu
3. Under **Project URL**, you'll see something like: `https://xxxxxxxxxxxxx.supabase.co`
4. **Copy this URL** - this is your `VITE_SUPABASE_URL`

### Step 3: Get Your Anon/Public Key

1. Still in the **Settings > API** page
2. Look for **Project API keys**
3. Find the **`anon` `public`** key (this is the one that starts with `eyJ...`)
4. **Copy this key** - this is your `VITE_SUPABASE_ANON_KEY`

⚠️ **Important**: Use the `anon` public key, NOT the `service_role` key (which is secret)

### Step 4: Run the Database Schema

**IMPORTANT**: You're getting an error because you're trying to run the filename. Here's how to fix it:

1. In Supabase, go to **SQL Editor** (in the left sidebar)
2. Click **New Query**
3. **Open the file `supabase-schema.sql`** from this project in a text editor
4. **Copy ALL the contents** of that file (not the filename!)
5. **Paste it into the SQL Editor** in Supabase
6. Click **Run** (or press Cmd/Ctrl + Enter)

The SQL file contains all the table definitions, triggers, and policies needed for ZipsMarket.

### Step 5: Verify Storage Bucket

1. Go to **Storage** in the left sidebar
2. You should see a bucket named `listing-images` (created by the SQL script)
3. If it doesn't exist, the SQL script should have created it, but you can manually create it:
   - Click **New bucket**
   - Name: `listing-images`
   - Make it **Public**

## Your .env File Should Look Like This:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.your-actual-key-here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
```

Replace the values with your actual credentials from Supabase.

## Database Password

Your database password (`AppleTech2025!`) is used for direct database connections, but for the React app, you only need the URL and anon key above.
