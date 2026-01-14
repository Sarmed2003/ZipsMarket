// Example Vercel Serverless Function for creating Stripe Payment Intents
// Place this file in: /api/create-payment-intent.js (for Vercel)
// Or use Supabase Edge Functions

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, listingId, buyerId, sellerId } = req.body

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
      },
      // Hold funds until released
      capture_method: 'manual',
    })

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    res.status(500).json({ error: error.message })
  }
}

// For Supabase Edge Functions, use this structure:
/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.6.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const { amount, listingId, buyerId, sellerId } = await req.json()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata: {
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
    },
    capture_method: 'manual',
  })

  return new Response(
    JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
*/
