import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal, json } from './_lib/env.js'

export default async function handler(req, res) {
  loadEnvLocal()

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const { transactionId } = req.body || {}
    if (!transactionId) return json(res, 400, { error: 'Missing transactionId' })

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!stripeSecretKey) {
      return json(res, 500, { error: 'Server misconfigured: STRIPE_SECRET_KEY is missing.' })
    }
    if (!supabaseUrl || !supabaseKey) {
      return json(res, 500, { error: 'Server misconfigured: SUPABASE_URL and keys are required.' })
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
    const admin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: tx, error: txError } = await admin
      .from('transactions')
      .select('id, stripe_payment_intent_id, status, funds_released, buyer_id, seller_id')
      .eq('id', transactionId)
      .single()

    if (txError || !tx) {
      return json(res, 404, { error: 'Transaction not found' })
    }
    if (tx.funds_released) {
      return json(res, 400, { error: 'Funds have already been released for this transaction' })
    }
    if (tx.status !== 'paid') {
      return json(res, 400, { error: 'Transaction must be paid before funds can be released' })
    }
    if (!tx.stripe_payment_intent_id) {
      return json(res, 400, { error: 'Transaction has no Stripe PaymentIntent' })
    }

    // Capture the PaymentIntent.
    // For destination charges (Stripe Connect), the transfer to the seller's
    // connected account happens automatically on capture.
    const paymentIntent = await stripe.paymentIntents.capture(tx.stripe_payment_intent_id)

    if (paymentIntent.status !== 'succeeded') {
      return json(res, 500, { error: 'Capture did not succeed' })
    }

    const { error: updateError } = await admin
      .from('transactions')
      .update({ status: 'completed', funds_released: true })
      .eq('id', transactionId)

    if (updateError) {
      console.error('capture-payment: failed to update transaction', updateError)
      return json(res, 500, { error: 'Failed to update transaction status' })
    }

    return json(res, 200, { success: true, message: 'Funds released' })
  } catch (e) {
    console.error('capture-payment error', e)
    return json(res, 500, { error: e.message || 'Failed to capture payment' })
  }
}
