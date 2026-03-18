/**
 * POST /api/send-order-email
 *
 * Sends transactional emails using Resend (https://resend.com).
 *
 * SETUP (one-time):
 *  1. Sign up at https://resend.com (free tier: 3,000 emails/month)
 *  2. Create an API key at https://resend.com/api-keys
 *  3. Add RESEND_API_KEY=re_xxxx to .env.local (and Vercel project env vars for production)
 *  4. Verify your domain at https://resend.com/domains
 *     • Until domain is verified, Resend only allows sending TO your own verified email.
 *     • For testing, set RESEND_FROM_EMAIL=onboarding@resend.dev and emails go to
 *       your own address so you can see them.
 *
 * Body: { transactionId: string, event: 'purchase_confirmed' | 'funds_released' }
 */

import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal, json } from './_lib/env.js'

// ── HTML email templates ──────────────────────────────────────────────────────

function buyerConfirmationEmail({ buyerName, sellerName, listing, amount, transactionId, appUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #041E42 0%, #031832 100%); padding: 32px 40px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: #A89968; margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #374151; margin-bottom: 24px; }
    .order-box { background: #f3f4f6; border-radius: 10px; padding: 24px; margin-bottom: 28px; }
    .order-box h2 { font-size: 15px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px; }
    .item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .item-title { font-size: 18px; font-weight: 700; color: #111827; }
    .item-price { font-size: 22px; font-weight: 800; color: #041E42; white-space: nowrap; }
    .meta { font-size: 13px; color: #6b7280; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .action-box { background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px; }
    .action-box h3 { font-size: 15px; font-weight: 700; color: #92400e; margin: 0 0 10px; }
    .action-box p { font-size: 14px; color: #78350f; margin: 0; line-height: 1.6; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #041E42, #031832); color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 12px; }
    .footer { background: #f9fafb; padding: 24px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>ZipsMarket</h1>
      <p>University of Akron's Student Marketplace</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${buyerName},</p>
      <p style="color:#374151;font-size:15px;margin-bottom:24px;">
        Your payment was successful! Here's your order summary.
      </p>

      <div class="order-box">
        <h2>Order Summary</h2>
        <div class="item-row">
          <div>
            <div class="item-title">${listing.title}</div>
            <div class="meta">Sold by: @${sellerName}</div>
          </div>
          <div class="item-price">$${parseFloat(amount).toFixed(2)}</div>
        </div>
        <div class="meta" style="margin-top:16px;">Transaction ID: <code style="font-size:11px;">${transactionId}</code></div>
      </div>

      <div class="action-box">
        <h3>⏳ Action Required — Rate Your Seller</h3>
        <p>
          Your payment is being held in escrow until you rate your seller. 
          Once you rate them on <strong>My Purchases</strong>, funds are released to the seller 
          and your transaction is marked complete.
        </p>
        <a href="${appUrl}/purchases" class="cta-btn">Go to My Purchases →</a>
      </div>

      <hr class="divider" />
      <p style="font-size:13px;color:#6b7280;line-height:1.6;">
        If you have any questions or concerns about your purchase, please reach out to the seller directly via the messaging feature on ZipsMarket.
      </p>
    </div>
    <div class="footer">
      ZipsMarket · University of Akron Student Marketplace<br/>
      This email was sent because you made a purchase on ZipsMarket.
    </div>
  </div>
</body>
</html>`
}

function sellerSaleEmail({ sellerName, buyerName, listing, amount, transactionId }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #041E42 0%, #031832 100%); padding: 32px 40px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: #A89968; margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #374151; margin-bottom: 24px; }
    .sale-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 24px; margin-bottom: 28px; }
    .sale-box h2 { font-size: 15px; font-weight: 600; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px; }
    .item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .item-title { font-size: 18px; font-weight: 700; color: #111827; }
    .item-price { font-size: 22px; font-weight: 800; color: #15803d; white-space: nowrap; }
    .meta { font-size: 13px; color: #6b7280; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .escrow-box { background: #f3f4f6; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px; }
    .escrow-box h3 { font-size: 14px; font-weight: 700; color: #374151; margin: 0 0 10px; }
    .escrow-box p { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6; }
    .footer { background: #f9fafb; padding: 24px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>ZipsMarket</h1>
      <p>University of Akron's Student Marketplace</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${sellerName},</p>
      <p style="color:#374151;font-size:15px;margin-bottom:24px;">
        🎉 Congratulations — your item sold!
      </p>

      <div class="sale-box">
        <h2>Sale Confirmed</h2>
        <div class="item-row">
          <div>
            <div class="item-title">${listing.title}</div>
            <div class="meta">Purchased by: @${buyerName}</div>
          </div>
          <div class="item-price">$${parseFloat(amount).toFixed(2)}</div>
        </div>
        <div class="meta" style="margin-top:16px;">Transaction ID: <code style="font-size:11px;">${transactionId}</code></div>
      </div>

      <div class="escrow-box">
        <h3>💰 About Your Funds</h3>
        <p>
          Your earnings are currently held in escrow. They will be released to you automatically 
          once the buyer rates their experience with you on ZipsMarket. This usually happens 
          within a few days of the transaction.
        </p>
      </div>

      <hr class="divider" />
      <p style="font-size:13px;color:#6b7280;line-height:1.6;">
        You can view all your sales and their status in the <strong>My Sales</strong> section of your ZipsMarket profile.
      </p>
    </div>
    <div class="footer">
      ZipsMarket · University of Akron Student Marketplace<br/>
      This email was sent because one of your listings was purchased.
    </div>
  </div>
</body>
</html>`
}

function sellerFundsReleasedEmail({ sellerName, listing, amount }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #041E42, #031832); padding: 32px 40px; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: #A89968; margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .highlight { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 24px; margin-bottom: 24px; text-align: center; }
    .amount { font-size: 36px; font-weight: 900; color: #15803d; }
    .footer { background: #f9fafb; padding: 24px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>ZipsMarket</h1>
      <p>University of Akron's Student Marketplace</p>
    </div>
    <div class="body">
      <p style="font-size:16px;color:#374151;">Hi ${sellerName},</p>
      <p style="font-size:15px;color:#374151;margin-bottom:24px;">Great news — your funds have been released! 🎉</p>
      <div class="highlight">
        <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">${listing.title}</div>
        <div class="amount">$${parseFloat(amount).toFixed(2)}</div>
        <div style="font-size:13px;color:#15803d;margin-top:8px;">Released to your Stripe balance</div>
      </div>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;">
        The buyer has rated their purchase. Your earnings are now in your Stripe balance. 
        Check your Stripe dashboard for payout details.
      </p>
    </div>
    <div class="footer">ZipsMarket · University of Akron Student Marketplace</div>
  </div>
</body>
</html>`
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  loadEnvLocal()

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // Email not configured — return success so the calling code doesn't break
    console.warn('[send-order-email] RESEND_API_KEY not set — skipping email')
    return json(res, 200, { skipped: true, reason: 'RESEND_API_KEY not configured' })
  }

  const { transactionId, event } = req.body || {}
  if (!transactionId) return json(res, 400, { error: 'Missing transactionId' })
  if (!['purchase_confirmed', 'funds_released'].includes(event)) {
    return json(res, 400, { error: 'event must be purchase_confirmed or funds_released' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return json(res, 500, { error: 'Supabase not configured' })
  }

  try {
    const admin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Fetch transaction with listing details
    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .select('*, listings(*)')
      .eq('id', transactionId)
      .single()

    if (txErr || !tx) return json(res, 404, { error: 'Transaction not found' })

    // Fetch buyer and seller profiles.
    // profiles.email is populated by the handle_new_user trigger on signup.
    // We intentionally do NOT use admin.auth.admin.listUsers() since that requires
    // SUPABASE_SERVICE_ROLE_KEY, which may not always be set.
    const [{ data: buyerProfile }, { data: sellerProfile }] = await Promise.all([
      admin.from('profiles').select('email, username').eq('id', tx.buyer_id).single(),
      admin.from('profiles').select('email, username').eq('id', tx.seller_id).single(),
    ])

    const buyerEmail = buyerProfile?.email || null
    const sellerEmail = sellerProfile?.email || null

    if (!buyerEmail && !sellerEmail) {
      console.warn('[send-order-email] No emails found for buyer or seller — check that profiles have email set')
    }

    const buyerName = buyerProfile?.username || buyerEmail?.split('@')[0] || 'Buyer'
    const sellerName = sellerProfile?.username || sellerEmail?.split('@')[0] || 'Seller'
    const rawFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromEmail = rawFrom.includes('<') ? rawFrom : `ZipsMarket <${rawFrom}>`
    // Use APP_URL env var for links in emails, fall back to localhost for dev
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')

    const resend = new Resend(resendKey)
    const results = []

    if (event === 'purchase_confirmed') {
      // Email to buyer: order confirmation + reminder to rate seller
      if (buyerEmail) {
        const { error: buyerEmailErr } = await resend.emails.send({
          from: fromEmail,
          to: buyerEmail,
          subject: `Order Confirmed — ${tx.listings?.title || 'Your ZipsMarket Purchase'}`,
          html: buyerConfirmationEmail({
            buyerName,
            sellerName,
            listing: tx.listings || { title: 'Item' },
            amount: tx.amount,
            transactionId: tx.id,
            appUrl,
          }),
        })
        if (buyerEmailErr) console.error('[send-order-email] buyer email error:', buyerEmailErr)
        else results.push('buyer_confirmation')
      }

      // Email to seller: sale notification + escrow explanation
      if (sellerEmail) {
        const { error: sellerEmailErr } = await resend.emails.send({
          from: fromEmail,
          to: sellerEmail,
          subject: `You made a sale — ${tx.listings?.title || 'Your Listing'}`,
          html: sellerSaleEmail({
            sellerName,
            buyerName,
            listing: tx.listings || { title: 'Item' },
            amount: tx.amount,
            transactionId: tx.id,
          }),
        })
        if (sellerEmailErr) console.error('[send-order-email] seller email error:', sellerEmailErr)
        else results.push('seller_sale')
      }
    }

    if (event === 'funds_released') {
      // Email to seller: funds released notification
      if (sellerEmail) {
        const { error: fundsEmailErr } = await resend.emails.send({
          from: fromEmail,
          to: sellerEmail,
          subject: `Funds Released — $${parseFloat(tx.amount).toFixed(2)} for "${tx.listings?.title}"`,
          html: sellerFundsReleasedEmail({
            sellerName,
            listing: tx.listings || { title: 'Item' },
            amount: tx.amount,
          }),
        })
        if (fundsEmailErr) console.error('[send-order-email] funds released email error:', fundsEmailErr)
        else results.push('seller_funds_released')
      }
    }

    return json(res, 200, { sent: results })
  } catch (e) {
    console.error('[send-order-email] error:', e)
    return json(res, 500, { error: e.message || 'Failed to send email' })
  }
}
