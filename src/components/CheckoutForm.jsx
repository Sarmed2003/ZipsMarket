import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function CheckoutForm({ listing, transactionId, onSuccess }) {
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

      // Confirm payment for the PaymentIntent used to render PaymentElement
      const { error: paymentError } = await stripe.confirmPayment({
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

      // Update transaction status
      if (transactionId) {
        await supabase
          .from('transactions')
          .update({ status: 'paid' })
          .eq('id', transactionId)
      }

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
