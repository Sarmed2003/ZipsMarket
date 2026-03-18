import { useEffect, useState, useMemo, useRef } from 'react'
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
  const intentCreatedFor = useRef(null)

  // MUST be before any early returns — React hooks cannot be called conditionally
  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: { colorPrimary: '#041E42' },
            },
          }
        : null,
    [clientSecret]
  )

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
      if (!listing || !user) return
      // Avoid creating a second PaymentIntent when React Strict Mode double-invokes effects.
      // Unmounting/remounting Elements with a new clientSecret can cause Payment Element load to fail.
      const key = `${listing.id}-${user.id}`
      if (intentCreatedFor.current === key) return
      intentCreatedFor.current = key

      setError('')

      if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
        const msg = 'Stripe is not configured yet. Add VITE_STRIPE_PUBLISHABLE_KEY to your environment variables.'
        console.error('[Checkout] Missing Stripe key')
        setError(msg)
        return
      }

      console.log('[Checkout] Creating payment intent for listing:', listing.id)

      try {
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, buyerId: user.id }),
        })

        console.log('[Checkout] API response status:', res.status)

        const raw = await res.text()
        console.log('[Checkout] API raw response:', raw.substring(0, 200))
        
        let json = null
        try {
          json = raw ? JSON.parse(raw) : null
        } catch (parseErr) {
          console.error('[Checkout] Failed to parse API response:', parseErr)
        }

        if (!res.ok) {
          const hint =
            res.status === 404
              ? 'Tip: Use `npm run dev:api` so the app and API run on http://localhost:3000 (Vercel dev).'
              : res.status === 500 && !json?.error
              ? 'Tip: Use `npm run dev:api` and open http://localhost:3000 so the payment API runs. Check the terminal for API errors.'
              : null
          const message =
            json?.error ||
            (raw ? raw.slice(0, 160) : '') ||
            `Request failed with status ${res.status}`
          console.error('[Checkout] API error:', message)
          throw new Error(hint ? `${message}\n\n${hint}` : message)
        }

        if (!json?.clientSecret) {
          console.error('[Checkout] Response missing clientSecret:', json)
          throw new Error('Payment intent response missing clientSecret.')
        }

        console.log('[Checkout] Got clientSecret, creating transaction...')
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

        if (transactionError) {
          console.error('[Checkout] Transaction creation error:', transactionError)
          throw transactionError
        }
        
        console.log('[Checkout] Transaction created:', transaction?.id)
        setTransactionId(transaction?.id || null)
      } catch (e) {
        console.error('[Checkout] Error creating payment intent:', e)
        setError(e.message || 'Failed to start checkout')
      }
    }

    createIntent()
  }, [listing, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#041E42] mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading listing...</div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <p className="text-xl mb-4 text-gray-900">Listing not found</p>
          <p className="text-gray-600 mb-6">This item may have been removed or doesn't exist.</p>
          <Link to="/" className="inline-block bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all">
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

          {clientSecret && stripePromise && elementsOptions ? (
            <Elements
              key={clientSecret}
              stripe={stripePromise}
              options={elementsOptions}
            >
              <CheckoutForm
                listing={listing}
                transactionId={transactionId}
                onSuccess={() => navigate('/purchases', { state: { justPurchased: true } })}
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

