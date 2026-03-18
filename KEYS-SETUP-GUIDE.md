# ZipsMarket Environment Variables Guide

## 🔑 Where to Find Your Keys

### Supabase Keys (Required)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (⚙️ in left sidebar) → **API**
4. You'll see two sections:

#### Project URL
```
https://omcngrfobfkbxcjlsjvd.supabase.co
```
Copy this EXACTLY as shown.

#### Project API keys
- **anon / public** key: A very long JWT token (150+ characters) starting with `eyJhbGc...`
  - This is safe to use in frontend (respects RLS)
  - Use this for BOTH `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`

- **service_role / secret** key: Also a JWT, but gives FULL database access
  - ⚠️ **NEVER** expose this in frontend or commit to git
  - Optional for current setup (can leave blank)

---

### Stripe Keys (Required)

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Make sure **Test mode** toggle is ON (top-right corner)
3. You'll see:

#### Publishable key
```
pk_test_51Sv1Yr0ilALD4sja...
```
- Use this for `VITE_STRIPE_PUBLISHABLE_KEY`
- Safe to expose in frontend

#### Secret key (click "Reveal test key")
```
sk_test_51Sv1Yr0ilALD4sja...
```
- Use this for `STRIPE_SECRET_KEY`
- ⚠️ **NEVER** expose in frontend or commit to git
- Only used in `/api/create-payment-intent.js`

---

## 📝 Your .env.local File

Copy this template and fill in YOUR actual keys:

```env
## Frontend (Vite) - These are loaded in the browser
VITE_SUPABASE_URL=https://omcngrfobfkbxcjlsjvd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...PASTE_YOUR_FULL_ANON_KEY_HERE
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...PASTE_YOUR_PUBLISHABLE_KEY_HERE

## API (Vercel Functions) - These are used server-side only
SUPABASE_URL=https://omcngrfobfkbxcjlsjvd.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...PASTE_YOUR_FULL_ANON_KEY_HERE
STRIPE_SECRET_KEY=sk_test_...PASTE_YOUR_SECRET_KEY_HERE

## Optional (leave blank for now)
SUPABASE_SERVICE_ROLE_KEY=
```

### ⚠️ CRITICAL NOTES

1. **No quotes** around values (just `KEY=value`, not `KEY="value"`)
2. **No spaces** around `=` sign
3. The **anon key** should be 150+ characters (a JWT token)
4. If your anon key looks like `sb_publishable_XXX` and is short, that's WRONG
   - Look for the JWT format key starting with `eyJ`
5. `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY` must be **identical**

---

## ✅ How to Verify Your Keys Are Correct

### Test Supabase Connection

Run this in your browser console (on localhost:3000):

```javascript
// Should print your Supabase URL
console.log(import.meta.env.VITE_SUPABASE_URL)

// Should print a long JWT starting with eyJ
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

### Test API Keys

After running `npm run dev:api`, try to purchase an item:
- If you get "STRIPE_SECRET_KEY is missing" → secret key not loaded
- If you get "SUPABASE_URL... required" → Supabase keys not loaded
- If Stripe checkout form appears → ✅ all keys working!

---

## 🚀 After Setting Keys

1. Save `.env.local`
2. Restart dev server:
   ```bash
   # Stop current server (Ctrl+C), then:
   npm run dev:api
   ```
3. Open http://localhost:3000
4. Sign in and try purchasing an item
5. Use test card: `4242 4242 4242 4242`, any future date, any CVC

---

## 🔒 Security Reminders

- ✅ `.env.local` is in `.gitignore` (never commit secrets)
- ✅ Anon key is safe to use client-side (respects RLS)
- ❌ Never commit or expose `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- 🔄 Before production: Add all env vars to Vercel project settings
