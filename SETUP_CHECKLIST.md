# ZipsMarket Setup Checklist

Follow these steps to get your marketplace up and running:

## ✅ Initial Setup

- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file with your credentials
- [ ] Test local development: `npm run dev`

## ✅ Supabase Setup

- [ ] Create Supabase account and project
- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Verify storage bucket `listing-images` exists
- [ ] Copy Project URL and anon key to `.env`
- [ ] Test authentication (try signing up with @uakron.edu email)

## ✅ Stripe Setup

- [ ] Create Stripe account
- [ ] Get Publishable Key from Dashboard
- [ ] Get Secret Key (for backend)
- [ ] Add keys to `.env`
- [ ] Set up webhook endpoint (see `api-example/webhook.js`)
- [ ] Create backend API route for payment intents (see `api-example/create-payment-intent.js`)

## ✅ Backend API Routes (Required for Payments)

You need to create these endpoints:

1. **Payment Intent Creation** (`/api/create-payment-intent`)
   - See `api-example/create-payment-intent.js`
   - Can use Vercel Serverless Functions or Supabase Edge Functions

2. **Stripe Webhook Handler** (`/api/webhook`)
   - See `api-example/webhook.js`
   - Configure webhook URL in Stripe Dashboard

## ✅ Email Notifications

Choose one method:

- [ ] **Option 1**: Set up Supabase SMTP (Settings > Auth > SMTP Settings)
- [ ] **Option 2**: Create Supabase Edge Function for email sending
- [ ] **Option 3**: Use external service (Resend, SendGrid, etc.)

Email triggers needed:
- Purchase confirmation (buyer & seller)
- Rating submitted (seller notification)
- Funds released (seller notification)

## ✅ Testing

- [ ] Test user signup with @uakron.edu email
- [ ] Test user signup with non-@uakron.edu email (should fail)
- [ ] Test creating a listing with images
- [ ] Test purchasing an item
- [ ] Test rating a seller
- [ ] Verify funds release after rating

## ✅ Deployment

- [ ] Push code to GitHub
- [ ] Import to Vercel
- [ ] Add environment variables in Vercel
- [ ] Deploy
- [ ] Test production deployment
- [ ] Update Stripe webhook URL to production domain

## 🔧 Troubleshooting

### Images not uploading?
- Check Supabase storage bucket permissions
- Verify RLS policies on storage.objects

### Payments not working?
- Verify Stripe keys are correct
- Check backend API routes are deployed
- Verify webhook is configured in Stripe Dashboard

### Email domain validation not working?
- Check database trigger is created
- Verify trigger function in Supabase SQL Editor

### Authentication issues?
- Verify Supabase URL and keys
- Check email confirmation settings in Supabase
- Ensure RLS policies are correct
