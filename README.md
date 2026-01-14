# ZipsMarket

A digital marketplace exclusively for University of Akron students, built with React, Supabase, and Stripe.

## Features

- 🔐 **Email-based Authentication**: Only @uakron.edu email addresses can sign up
- 🛍️ **Item Listings**: Students can create listings with multiple images and descriptions
- 💳 **Secure Payments**: Stripe integration for handling transactions
- ⭐ **Rating System**: Buyers can rate sellers after purchase
- 💰 **Escrow System**: Funds are held until buyer rates the seller
- 📧 **Email Notifications**: Automatic email notifications for purchases
- 🎨 **University Branding**: Styled with University of Akron colors

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Hosting**: Vercel

## Prerequisites

- Node.js 18+ and npm
- A Supabase account
- A Stripe account
- A Vercel account (for deployment)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the SQL from `supabase-schema.sql`
3. Go to Storage and create a bucket named `listing-images` (or it will be created by the SQL script)
4. Go to Settings > API and copy your:
   - Project URL
   - `anon` public key

### 3. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your Publishable Key from the Dashboard
3. Set up a webhook endpoint for payment confirmations (you'll need to create a backend API route for this)

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── CheckoutForm.jsx
│   ├── ProtectedRoute.jsx
│   └── RatingModal.jsx
├── contexts/           # React contexts
│   └── AuthContext.jsx
├── lib/               # Utility libraries
│   ├── supabase.js
│   └── stripe.js
├── pages/             # Page components
│   ├── CreateListing.jsx
│   ├── Home.jsx
│   ├── ListingDetail.jsx
│   ├── Login.jsx
│   ├── Profile.jsx
│   ├── Purchases.jsx
│   └── Signup.jsx
├── App.jsx            # Main app component with routing
└── main.jsx           # Entry point
```

## Database Schema

### Tables

- **profiles**: User profile information
- **listings**: Product listings created by users
- **transactions**: Purchase transactions
- **seller_ratings**: Aggregated seller ratings

See `supabase-schema.sql` for complete schema and policies.

## Payment Flow

1. Buyer clicks "Purchase Item" on a listing
2. Stripe payment form is displayed
3. Payment is processed and transaction is created with status `pending_payment`
4. Transaction status is updated to `paid` after successful payment
5. Listing is marked as `sold`
6. Email notifications are sent to buyer and seller
7. Buyer rates the seller (1-5 stars)
8. Funds are released to seller when rating is submitted
9. Transaction status is updated to `completed`

## Email Notifications

Email notifications need to be set up using one of these methods:

1. **Supabase Edge Functions**: Create edge functions to send emails via SendGrid, Resend, or similar
2. **External Service**: Use a service like Resend, SendGrid, or AWS SES
3. **Supabase SMTP**: Configure custom SMTP in Supabase settings

You'll need to add email sending logic in:
- After successful purchase (notify buyer and seller)
- After rating submission (notify seller about released funds)

## Deployment to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically detect Vite and configure the build settings.

## Stripe Backend Setup

For production, you'll need to create backend API routes to:

1. Create Payment Intents
2. Handle webhooks for payment confirmations
3. Process refunds if needed

You can use:
- Vercel Serverless Functions
- Supabase Edge Functions
- A separate Node.js backend

Example endpoint structure:
```
POST /api/create-payment-intent
POST /api/webhook (Stripe webhook handler)
```

## Security Notes

- Email domain validation is enforced at the database level
- Row Level Security (RLS) is enabled on all tables
- Users can only access their own transactions
- Image uploads are restricted to authenticated users
- All sensitive operations require authentication

## Future Enhancements

- [ ] Real-time messaging between buyers and sellers
- [ ] Advanced search and filtering
- [ ] Categories and tags
- [ ] Saved/favorite listings
- [ ] Seller verification badges
- [ ] Dispute resolution system
- [ ] Mobile app (React Native)

## License

This project is for University of Akron students only.

## Support

For issues or questions, please contact the development team.