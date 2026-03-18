import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal, json } from './_lib/env.js'

// Platform fee as a fraction (9% mirrors Grailed's commission model)
const PLATFORM_FEE_PERCENT = 0.09

export default async function handler(req, res) {
  loadEnvLocal()

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const { listingId, buyerId } = req.body || {}
    if (!listingId) return json(res, 400, { error: 'Missing listingId' })

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY

    if (!stripeSecretKey) {
      return json(res, 500, {
        error: 'Server misconfigured: STRIPE_SECRET_KEY is missing.',
      })
    }
    if (!supabaseUrl || !supabaseKey) {
      return json(res, 500, {
        error: 'Server misconfigured: SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.',
      })
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
    const admin = createClient(supabaseUrl, supabaseKey, {
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
      return json(res, 400, { error: 'This item has already been sold' })
    }
    if (buyerId && buyerId === listing.user_id) {
      return json(res, 400, { error: 'Seller cannot purchase their own listing' })
    }

    // Duplicate purchase guard
    const { data: existingTx } = await admin
      .from('transactions')
      .select('id, status')
      .eq('listing_id', listingId)
      .in('status', ['pending_payment', 'paid', 'completed'])
      .limit(1)
      .single()

    if (existingTx) {
      return json(res, 400, { error: 'This item already has an active transaction and cannot be purchased again' })
    }

    const amountCents = Math.round(Number(listing.price) * 100)
    if (!amountCents || amountCents < 50) {
      return json(res, 400, {
        error: `Price must be at least $0.50 USD. This listing is priced at $${Number(listing.price).toFixed(2)}.`,
      })
    }

    // Look up the seller's Stripe Connected Account for destination charges
    const { data: sellerProfile } = await admin
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', listing.user_id)
      .single()

    const sellerStripeId = sellerProfile?.stripe_onboarding_complete
      ? sellerProfile.stripe_account_id
      : null

    // Build the PaymentIntent params
    const piParams = {
      amount: amountCents,
      currency: 'usd',
      payment_method_types: ['card'],
      capture_method: 'manual',
      metadata: {
        listing_id: listing.id,
        seller_id: listing.user_id,
        buyer_id: buyerId || '',
        platform_fee_percent: String(PLATFORM_FEE_PERCENT),
      },
      description: `ZipsMarket - ${listing.title}`,
    }

    // If the seller has completed Stripe Connect onboarding, route funds to them
    if (sellerStripeId) {
      const applicationFee = Math.round(amountCents * PLATFORM_FEE_PERCENT)
      piParams.application_fee_amount = applicationFee
      piParams.transfer_data = { destination: sellerStripeId }
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams)

    return json(res, 200, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      connectEnabled: !!sellerStripeId,
    })
  } catch (e) {
    console.error('create-payment-intent error', e)
    return json(res, 500, { error: e.message || 'Internal server error' })
  }
}
