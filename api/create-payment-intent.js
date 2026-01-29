import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const { listingId, buyerId } = req.body || {}
    if (!listingId) return json(res, 400, { error: 'Missing listingId' })

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return json(res, 500, { error: 'Server misconfigured (missing Supabase env vars)' })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id, user_id, price, sold, title')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return json(res, 404, { error: 'Listing not found' })
    }
    if (listing.sold) {
      return json(res, 400, { error: 'Listing is already sold' })
    }
    if (buyerId && buyerId === listing.user_id) {
      return json(res, 400, { error: 'Seller cannot purchase their own listing' })
    }

    // NOTE: For a true escrow/release-after-rating system you will likely use Stripe Connect.
    // This creates a manual-capture PaymentIntent as a starting point.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(listing.price) * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      capture_method: 'manual',
      metadata: {
        listing_id: listing.id,
        seller_id: listing.user_id,
        buyer_id: buyerId || '',
      },
      description: `ZipsMarket - ${listing.title}`,
    })

    return json(res, 200, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (e) {
    console.error('create-payment-intent error', e)
    return json(res, 500, { error: e.message || 'Internal server error' })
  }
}

