import { useState, useEffect } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'

export default function CheckoutForm({ listing, transactionId, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [elementReady, setElementReady] = useState(false)

  // Fallback: if onReady doesn't fire within 10s (e.g. slow network), enable button anyway
  useEffect(() => {
    const t = setTimeout(() => setElementReady(true), 10000)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      // Step 1: Validate the form and ensure PaymentElement is mounted.
      // submit() must be called before confirmPayment to avoid "elements should have a mounted Payment Element" error.
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || 'Please complete the payment form.')
        setLoading(false)
        return
      }

      // Step 2: Confirm the payment
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/purchases`,
        },
        redirect: 'if_required',
      })

      if (paymentError) {
        setError(paymentError.message)
        setLoading(false)
        return
      }

      // Payment succeeded (no redirect required for most test cards)
      if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
        if (transactionId) {
          const { error: txError } = await supabase
            .from('transactions')
            .update({ status: 'paid' })
            .eq('id', transactionId)
          if (txError) {
            setError(txError.message || 'Failed to record payment. Your card may still have been charged.')
            setLoading(false)
            return
          }
        }

        const { error: listingError } = await supabase
          .from('listings')
          .update({ sold: true })
          .eq('id', listing.id)
        if (listingError) {
          console.error('Failed to mark listing sold:', listingError)
        }

        // Send purchase confirmation emails (non-blocking — don't prevent navigation on failure)
        if (transactionId) {
          fetch('/api/send-order-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId, event: 'purchase_confirmed' }),
          }).catch((err) => console.warn('[CheckoutForm] email notification failed:', err))
        }

        onSuccess()
      }
    } catch (err) {
      setError(err.message || 'An error occurred processing your payment.')
      setLoading(false)
    }
  }

  // Wait for stripe and elements to be ready before showing the form
  if (!stripe || !elements) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#041E42] mr-3"></div>
        <span>Loading secure payment form...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-h-[220px] py-2">
        <PaymentElement
          options={{ layout: 'tabs' }}
          onReady={() => {
            setElementReady(true)
            setError(null)
          }}
          onLoadError={(e) => {
            const message = e?.message || (e && typeof e === 'object' && 'error' in e && e.error?.message) || 'Unable to load payment form.'
            setError(message)
            console.error('[PaymentElement] onLoadError', e)
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm space-y-1">
          <p>{error}</p>
          <p className="text-xs text-red-600 mt-2">
            Ensure VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY in .env.local are from the same Stripe account and same mode (both pk_test_/sk_test_ for test, or both pk_live_/sk_live_ for live). Remove any Stripe keys from .env so .env.local wins. Restart the dev server and hard-refresh the browser.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elementReady || loading}
        className="w-full bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay $${parseFloat(listing.price).toFixed(2)}`
        )}
      </button>
    </form>
  )
}
