// Example Stripe Webhook Handler
// Place this file in: /api/webhook.js (for Vercel)
// Configure the webhook URL in Stripe Dashboard: https://yourdomain.com/api/webhook

import Stripe from 'stripe'
import { supabase } from '../src/lib/supabase' // Adjust import path as needed

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      // Update transaction status in database
      await supabase
        .from('transactions')
        .update({ status: 'paid' })
        .eq('stripe_payment_intent_id', paymentIntent.id)
      
      // Send email notifications (implement your email service here)
      break

    case 'payment_intent.payment_failed':
      // Handle failed payment
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
}

// For Vercel, you may need to configure the body parser:
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// }
