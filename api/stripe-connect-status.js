/**
 * POST /api/stripe-connect-status
 *
 * Checks whether a seller's Stripe Express connected account has completed
 * onboarding (charges_enabled). Updates the profile accordingly.
 *
 * Body: { userId: string }
 * Returns: { chargesEnabled: boolean, payoutsEnabled: boolean, detailsSubmitted: boolean }
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal, json } from './_lib/env.js'

export default async function handler(req, res) {
  loadEnvLocal()

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const { userId } = req.body || {}
  if (!userId) return json(res, 400, { error: 'Missing userId' })

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!stripeSecretKey || !supabaseUrl || !supabaseKey) {
    return json(res, 500, { error: 'Server misconfigured' })
  }

  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (profileErr || !profile?.stripe_account_id) {
      return json(res, 200, { chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false })
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id)

    // Update the onboarding status in the profile
    if (account.charges_enabled) {
      await supabase
        .from('profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('id', userId)
    }

    return json(res, 200, {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    })
  } catch (e) {
    console.error('stripe-connect-status error:', e)
    return json(res, 500, { error: e.message || 'Failed to check account status' })
  }
}
