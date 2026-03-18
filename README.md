# ZipsMarket

A digital marketplace exclusively for University of Akron students. Buy and sell items securely with fellow Zips!

## Features

- 🔐 **Exclusive Access**: Only @uakron.edu email addresses allowed
- 🛍️ **Item Listings**: Create listings with multiple images, descriptions, categories, and pricing
- 💳 **Secure Payments**: Stripe integration with escrow (funds held until buyer rates)
- ⭐ **Rating System**: Rate sellers after purchase to build trust
- 💬 **Messaging**: Direct communication between buyers and sellers
- ❤️ **Likes & Following**: Save favorite items and follow other sellers
- 🎨 **University Branding**: Designed with UA colors (Navy #041E42, Gold #A89968)

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (manual capture for escrow)
- **File Storage**: Supabase Storage
- **Hosting**: Vercel

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- Stripe account ([stripe.com](https://stripe.com))

### 2. Clone and Install

```bash
git clone https://github.com/Sarmed2003/ZipsMarket.git
cd ZipsMarket
npm install
```

### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run the entire contents of `supabase-complete-schema.sql`
3. Wait for "Success. No rows returned" (this creates all tables, policies, indexes, triggers)

### 4. Get Your API Keys

#### Supabase Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon / public** key (very long JWT starting with `eyJ...`, ~150+ characters)

#### Stripe Keys (Test Mode)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test mode** (toggle in top-right)
3. Copy:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

### 5. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
## Frontend (Vite)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...YOUR_LONG_ANON_KEY_HERE
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY

## API (Vercel Functions)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...YOUR_LONG_ANON_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY

## Optional (leave blank for now)
SUPABASE_SERVICE_ROLE_KEY=
```

**Important:**
- `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY` should be **identical** (the anon public key)
- Never commit `.env.local` to git (already in `.gitignore`)
- The anon key is safe to use in frontend and API (it respects RLS)

### 6. Run Development Server

```bash
npm run dev:api
```

This starts the app and API on **http://localhost:3000**

Test with Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date and any 3-digit CVC

---

## Project Structure

```
ZipsMarket/
├── api/
│   └── create-payment-intent.js  # Vercel serverless function for Stripe
├── src/
│   ├── components/               # Reusable UI components
│   ├── contexts/                 # React contexts (Auth)
│   ├── lib/                      # Supabase & Stripe clients
│   ├── pages/                    # Main app pages
│   ├── App.jsx                   # Router setup
│   └── main.jsx                  # Entry point
├── supabase-complete-schema.sql  # Complete database schema
├── .env.local                    # Local env vars (gitignored)
├── package.json
└── vercel.json
```

---

## Database Schema Overview

| Table | Description |
|-------|-------------|
| **profiles** | User profiles (auto-created on signup) |
| **listings** | Items for sale with images, price, category |
| **transactions** | Purchase records with Stripe PaymentIntent ID |
| **seller_ratings** | Aggregated seller ratings (average + count) |
| **follows** | User following relationships |
| **likes** | Saved/liked listings |
| **messages** | Buyer-seller direct messages |

All tables have Row Level Security (RLS) enabled.

---

## Payment Flow (Current)

1. Buyer clicks **Purchase** on a listing
2. API creates Stripe PaymentIntent with `capture_method: 'manual'` (holds funds)
3. Buyer enters card details and confirms payment
4. Transaction record created with status `paid`
5. Listing marked as `sold`
6. **TODO**: Buyer rates seller (1-5 stars)
7. **TODO**: Funds captured/released when rating submitted

---

## Development vs Production

### Test Mode (Current)
- Using Stripe test keys (`pk_test_...`, `sk_test_...`)
- Payments are simulated (no real charges)
- Test email `sarmedmahmood91903@gmail.com` allowed for dev

### Production (Before Launch)
- Switch to Stripe live keys (`pk_live_...`, `sk_live_...`)
- Remove test email from `check_user_domain()` function
- Add env vars to Vercel project settings
- Set up Stripe webhook for payment verification

---

## Deployment to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel auto-detects Vite settings

3. **Add Environment Variables:**
   - In Vercel dashboard: **Settings** → **Environment Variables**
   - Add all variables from `.env.local` (select **Production**, **Preview**, and **Development**)
   - **DO NOT** add `VITE_` prefix variables to "Development" if you want to use `vercel dev` locally with `.env.local`

4. **Deploy:**
   - Click **Deploy**
   - Your app will be live at `https://zipsmarket.vercel.app` (or your custom domain)

---

## Next Steps (After Keys Are Fixed)

- [ ] Test full purchase flow with Stripe test cards
- [ ] Add `/api/capture-payment` to release funds after rating
- [ ] Add email notifications (purchase confirmation, rating alerts)
- [ ] Add Stripe webhook for server-side payment verification
- [ ] Hide "Purchase" button on your own listings
- [ ] Add search bar and price filters
- [ ] Deploy to Vercel production

---

## Security Notes

- Email domain validation enforced at database level (trigger)
- Row Level Security (RLS) on all tables
- Stripe Secret Key only used server-side (never exposed to frontend)
- User can only access their own transactions/messages
- Image uploads restricted to authenticated users

---

## Support

For issues or questions, contact the ZipsMarket development team.

**University of Akron Students Only** 🔵🟡
