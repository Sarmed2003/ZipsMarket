# 🔍 White Screen Debug Guide

## Your Keys Status: ✅ VALID

Your `.env.local` keys are now **correct**:
- ✅ Supabase URL: `https://omcngrfobfkbxcjlsjvd.supabase.co`
- ✅ Supabase Anon Key: Valid JWT (237 characters)
- ✅ Stripe Publishable Key: `pk_test_51Sv1Yr0ilALD4sja...`
- ✅ Stripe Secret Key: `sk_test_51Sv1Yr0ilALD4sja...`

---

## Step-by-Step Debugging

### Step 1: Make Sure You're Running on Port 3000

**Stop any existing dev servers** (Ctrl+C in all terminals), then run:

```bash
npm run dev:api
```

**Expected output:**
```
Vercel CLI 50.x.x
> Running Dev Command "vite --port $PORT --strictPort"

  VITE v7.3.1  ready in XX ms

  ➜  Local:   http://localhost:3000/
> Ready! Available at http://localhost:3000
```

**If you see errors like "ECONNREFUSED"** - the API isn't running. Make sure you use `npm run dev:api`, not `npm run dev`.

---

### Step 2: Open Browser Console

1. Open **http://localhost:3000** in Chrome/Firefox
2. Press **F12** or **Cmd+Option+I** (Mac) to open Developer Tools
3. Go to the **Console** tab
4. Keep it open while testing

---

### Step 3: Test Checkout Flow

1. Sign in with your account
2. Click on any listing
3. Click **"Purchase Item"**
4. **Watch the Console tab**

Look for messages starting with `[Checkout]`:

**✅ Good signs:**
```
[Checkout] Waiting for listing or user...
[Checkout] Creating payment intent for listing: <uuid>
[Checkout] API response status: 200
[Checkout] Got clientSecret, creating transaction...
[Checkout] Transaction created: <uuid>
```

**❌ Bad signs (and fixes):**

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `[Checkout] API response status: 404` | API not running | Use `npm run dev:api` (not `npm run dev`) |
| `[Checkout] API response status: 500` | Server error | Check terminal for API error logs |
| `[Checkout] Missing Stripe key` | Env not loaded | Restart dev server after saving `.env.local` |
| `[Checkout] Transaction creation error` | RLS policy issue | Run `supabase-complete-schema.sql` |
| `Failed to parse API response` | API returned HTML | API not running or wrong port |

---

### Step 4: Use Debug Page

Open: **http://localhost:3000/debug.html**

This page tests:
1. ✅ Environment variables loaded
2. ✅ Stripe.js initialization
3. ✅ API endpoint reachable
4. ✅ Console errors

Click **"Test /api/create-payment-intent"** to verify the API works.

---

### Step 5: Check Network Tab

In Dev Tools, go to **Network** tab:

1. Click on a listing → Click "Purchase Item"
2. Look for request to `/api/create-payment-intent`
3. Click on it to see:
   - **Status**: Should be `200 OK` (green)
   - **Response**: Should have `clientSecret` and `paymentIntentId`
   - **Timing**: Should complete in < 2 seconds

**If you see:**
- **Status 404**: API not running on port 3000
- **Status 500**: Check API logs in terminal
- **Status (failed)**: Network issue or API crashed
- **No request at all**: React Router issue or JavaScript error

---

## Common Issues & Fixes

### Issue 1: White Screen, No Console Logs

**Cause:** React app crashed before rendering.

**Fix:**
1. Open browser console
2. Look for red error messages
3. Check if Supabase/Stripe imports failed
4. Verify `.env.local` is saved and server restarted

---

### Issue 2: "Preparing secure checkout..." Forever

**Cause:** `clientSecret` never gets set.

**Possible reasons:**
1. API request failing (check Console for `[Checkout] API response status`)
2. API returning without `clientSecret` (check Network → Response tab)
3. Transaction creation failing (check Console for `Transaction creation error`)

**Fix:**
- Check browser console for `[Checkout]` logs
- Check terminal for API error logs
- Verify you're on **http://localhost:3000** (not 5173)

---

### Issue 3: API Returns 500 Error

**Check terminal output** where `npm run dev:api` is running.

**Common 500 errors:**

| Error in Terminal | Fix |
|-------------------|-----|
| `STRIPE_SECRET_KEY is missing` | Verify `.env.local` has `STRIPE_SECRET_KEY=sk_test_...` |
| `SUPABASE_URL... required` | Verify `.env.local` has `SUPABASE_URL` and `SUPABASE_ANON_KEY` |
| `Listing not found` | Verify listing exists in database |
| `Invalid API Key provided` | Stripe secret key is wrong (copy from Stripe Dashboard) |

---

### Issue 4: Transaction Creation Fails

**Error:** `Transaction creation error: new row violates row-level security policy`

**Cause:** RLS policy not allowing insert.

**Fix:**
1. Go to Supabase SQL Editor
2. Run this to check if schema is correct:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'transactions';
   ```
3. If no policies exist, re-run `supabase-complete-schema.sql`

---

## Testing Checklist

After fixing issues, test this flow:

- [ ] Run `npm run dev:api`
- [ ] Open **http://localhost:3000**
- [ ] Sign in with `@uakron.edu` email
- [ ] Open browser console (F12)
- [ ] Click on a listing
- [ ] Click "Purchase Item"
- [ ] See Checkout page (not white screen)
- [ ] See "Preparing secure checkout..." briefly
- [ ] See Stripe payment form appear
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Enter future date (e.g., `12/26`) and any CVC (e.g., `123`)
- [ ] Click "Pay $XX.XX"
- [ ] Redirected to Purchases page
- [ ] Purchase shows in My Purchases

---

## Still Not Working?

**Send me:**
1. Full browser console output (copy/paste all text)
2. Terminal output where `npm run dev:api` is running
3. Network tab screenshot showing `/api/create-payment-intent` request

**Things to check:**
- Are you on **http://localhost:3000** (not 5173)?
- Did you restart the dev server after changing `.env.local`?
- Is there a firewall blocking port 3000?
- Do you have multiple terminals running (kill all, start fresh)?

---

## Quick Reset

If everything is broken, try this:

```bash
# Kill all node/vercel processes
killall node
killall vercel

# Clean install
rm -rf node_modules .vercel
npm install

# Start fresh
npm run dev:api
```

Then open http://localhost:3000 and try again.
