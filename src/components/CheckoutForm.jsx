import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function CheckoutForm({ listing, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message)
        setLoading(false)
        return
      }

      // Create a transaction record first
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.user_id,
          amount: listing.price,
          status: 'pending_payment',
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Create payment intent via your backend API
      // NOTE: You need to create a backend endpoint at /api/create-payment-intent
      // See api-example/create-payment-intent.js for reference
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: listing.price,
          listingId: listing.id,
          buyerId: user.id,
          sellerId: listing.user_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret } = await response.json()

      // Confirm payment with the client secret
      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        clientSecret,
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

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'paid' })
        .eq('id', transaction.id)

      // Mark listing as sold
      await supabase
        .from('listings')
        .update({ sold: true })
        .eq('id', listing.id)

      // TODO: Send email notifications to buyer and seller
      // This would be done via a Supabase Edge Function or external service

      onSuccess()
    } catch (err) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="text-red-600 text-sm mt-2">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
      >
        {loading ? 'Processing...' : `Pay $${parseFloat(listing.price).toFixed(2)}`}
      </button>
    </form>
  )
}
