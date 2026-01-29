import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'
import { Elements } from '@stripe/react-stripe-js'
import stripePromise from '../lib/stripe'
import CheckoutForm from '../components/CheckoutForm'

export default function Checkout() {
  const { id: listingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState(null)
  const [transactionId, setTransactionId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchListing()
  }, [listingId])

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single()

      if (error) throw error
      setListing(data)
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const createIntent = async () => {
      setError('')
      setClientSecret(null)
      setTransactionId(null)

      if (!listing || !user) return
      if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
        setError('Stripe is not configured yet. Add VITE_STRIPE_PUBLISHABLE_KEY to your environment variables.')
        return
      }

      try {
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, buyerId: user.id }),
        })

        // In local dev, /api/* may not exist (Vite won't serve Vercel Functions).
        // Parse defensively so we can show the real error.
        const raw = await res.text()
        let json = null
        try {
          json = raw ? JSON.parse(raw) : null
        } catch {
          // non-JSON response (often 404 HTML)
        }

        if (!res.ok) {
          const hint =
            res.status === 404
              ? 'Tip: /api routes run on Vercel. For local Stripe testing, run `npx vercel dev` (or deploy to Vercel).'
              : null
          const message =
            json?.error ||
            (raw ? raw.slice(0, 160) : '') ||
            `Request failed with status ${res.status}`
          throw new Error(hint ? `${message}\n\n${hint}` : message)
        }

        if (!json?.clientSecret) {
          throw new Error('Payment intent response missing clientSecret.')
        }

        setClientSecret(json.clientSecret)

        // Create a transaction record tied to this PaymentIntent (client-side via RLS)
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            listing_id: listing.id,
            buyer_id: user.id,
            seller_id: listing.user_id,
            amount: listing.price,
            status: 'pending_payment',
            stripe_payment_intent_id: json?.paymentIntentId || null,
          })
          .select('id')
          .single()

        if (transactionError) throw transactionError
        setTransactionId(transaction?.id || null)
      } catch (e) {
        console.error('Error creating payment intent:', e)
        setError(e.message || 'Failed to start checkout')
      }
    }

    createIntent()
  }, [listing, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Listing not found</p>
          <Link to="/" className="text-blue-900 hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-[#041E42] mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="flex items-center gap-4">
              {listing.images?.[0] && (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{listing.title}</h3>
                <p className="text-gray-600 mt-1">{listing.description}</p>
              </div>
              <p className="text-2xl font-bold text-[#041E42]">
                ${parseFloat(listing.price).toFixed(2)}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          )}

          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                listing={listing}
                transactionId={transactionId}
                onSuccess={() => navigate('/purchases')}
              />
            </Elements>
          ) : (
            <div className="text-sm text-gray-600">
              {error ? 'Fix the issue above to continue.' : 'Preparing secure checkout...'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

