# Payment Testing Guide

Use **Stripe test mode** to test checkout and rating flows without moving real money.

---

## Stay safe: avoid using real money during testing

- **Always use test keys** when developing: `pk_test_...` and `sk_test_...` in `.env.local`. Test cards (e.g. 4242 4242 4242 4242) only work with test keys; they are rejected in live mode.
- **Never enter a real card** on a page that uses test keys. If you see a test-mode indicator or you know you’re on test keys, only use Stripe test card numbers.
- **Double-check `.env.local`** before running the app: if you see `pk_live_` or `sk_live_`, you are in live mode and real charges can occur. Switch to `pk_test_` / `sk_test_` for safe testing.
- **Optional:** Add a small “Test mode” banner in the UI when `VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_test_` so it’s obvious you’re not in live mode.

---

## 1. Switch to Stripe Test Keys

1. Go to [Stripe Dashboard → API keys](https://dashboard.stripe.com/test/apikeys)
2. Ensure you're in **Test mode** (toggle in the top right)
3. Copy your **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)
4. Update `.env.local`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
   STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
   ```
5. Restart the dev server: `npm run dev:api`
6. Hard-refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)

---

## 2. Stripe Test Card Numbers

| Card Number        | Result           |
|--------------------|------------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 9995 | Declined          |
| 4000 0000 0000 3220 | 3D Secure required |

**Use any:**
- Expiration: Future date (e.g. `12/34`)
- CVC: Any 3 digits (e.g. `123`)
- ZIP: Any 5 digits (e.g. `12345`)

---

## 3. End-to-End Test Flow

### Step 1: Checkout

1. Browse a listing and click **Purchase**
2. On the checkout page, enter:
   - **Card:** 4242 4242 4242 4242
   - **Expiry:** 12/34
   - **CVC:** 123
   - **ZIP:** 12345
3. Click **Pay $X.XX**
4. You should be redirected to **Purchases**

### Step 2: Rate the Seller

1. On **Purchases**, the item should show **Paid** and a **Rate Seller** button
2. Click **Rate Seller**
3. Choose 1–5 stars and optionally add a review
4. Click **Submit Rating**
5. Funds are **captured** at this moment (released from hold into your Stripe balance)
6. The transaction status becomes **Completed**

---

## 4. Escrow Flow (How It Works)

1. **Checkout** → Payment is **authorized** (card charged, funds held by Stripe)
2. **Listing** marked sold, **transaction** status: `paid`
3. **Purchases** → Buyer sees **Rate Seller**
4. **Submit rating** → API calls Stripe `capture` → Funds move to your Stripe balance

Until the buyer rates, the funds stay in a hold. Manual capture is used so you can release funds only after the rating.

---

## 5. Viewing Test Data

- **Stripe Dashboard (test):** [dashboard.stripe.com/test](https://dashboard.stripe.com/test)
  - Payments → Check payments, PaymentIntents
- **Supabase:** `transactions` table for status, rating, `funds_released`

---

## 6. Seller rates buyer (Profile → My Sales)

After a sale, the seller can rate the buyer from **Profile → My Sales**:

1. Open your profile and scroll to **My Sales**.
2. For a sold item, click **Rate buyer**.
3. Choose 1–5 stars and optionally add a short description of the experience.
4. Submit. The rating is stored on the transaction.

**Database:** If you don’t have the columns yet, run in Supabase SQL Editor:

- `supabase-migrations/add-buyer-rating-columns.sql`

---

## 7. Switching Back to Live Keys

When ready for real payments:

1. Use live keys in `.env.local` (`pk_live_...`, `sk_live_...`)
2. Restart dev server and hard-refresh
3. Real cards will be charged; test cards will not work in live mode
