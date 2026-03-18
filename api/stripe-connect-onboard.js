/**
 * POST /api/stripe-connect-onboard
 *
 * Creates a Stripe Express connected account for the seller (if they don't
 * have one yet), then returns an Account Link URL for Stripe-hosted onboarding.
 *
 * Body: { userId: string }
 * Returns: { url: string } — redirect the seller to this URL
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
    return json(res, 500, { error: 'Server misconfigured — missing Stripe or Supabase keys' })
  }

  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Check if the seller already has a connected account
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete, email')
      .eq('id', userId)
      .single()

    if (profileErr || !profile) {
      return json(res, 404, { error: 'Profile not found' })
    }

    let accountId = profile.stripe_account_id

    if (!accountId) {
      // Create a new Stripe Express connected account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: profile.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { zipsmarket_user_id: userId },
      })

      accountId = account.id

      // Save the connected account ID to the profile
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', userId)

      if (updateErr) {
        console.error('Failed to save stripe_account_id:', updateErr)
        return json(res, 500, { error: 'Failed to save Stripe account to profile' })
      }
    }

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')

    // Create an Account Link for Stripe-hosted onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/profile?stripe_refresh=true`,
      return_url: `${appUrl}/profile?stripe_onboard=complete`,
      type: 'account_onboarding',
    })

    return json(res, 200, { url: accountLink.url })
  } catch (e) {
    console.error('stripe-connect-onboard error:', e)
    return json(res, 500, { error: e.message || 'Failed to start onboarding' })
  }
}
