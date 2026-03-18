import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Star, Package, RefreshCw, Home, CheckCircle } from 'lucide-react'
import RatingModal from '../components/RatingModal'
import BackButton from '../components/BackButton'

export default function Purchases() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showCongrats, setShowCongrats] = useState(location.state?.justPurchased === true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchPurchases()
  }, [user?.id])

  const fetchPurchases = async () => {
    if (!user?.id) return
    setFetchError(null)
    try {
      // profiles:seller_id(*) requires the FK on transactions.seller_id to point
      // to public.profiles(id). Run supabase-migrations/fix-transaction-fk-for-profiles-join.sql
      // if this query still errors.
      const { data, error } = await supabase
        .from('transactions')
        .select('*, listings(*), seller:seller_id(*)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (err) {
      console.error('Error fetching purchases:', err)
      setFetchError(err?.message || 'Failed to load purchases. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }

  const handleRatingComplete = () => {
    setSelectedTransaction(null)
    fetchPurchases()
  }

  // 'paid' means payment was captured but buyer hasn't rated yet — show as "Pending Rating"
  // 'completed' means buyer rated and funds were released — show as "Completed"
  const statusLabel = (status) => {
    if (status === 'completed') return { label: 'Completed', cls: 'bg-green-100 text-green-800' }
    if (status === 'paid') return { label: 'Pending Rating', cls: 'bg-yellow-100 text-yellow-800' }
    if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-red-100 text-red-800' }
    return { label: 'Processing', cls: 'bg-gray-100 text-gray-700' }
  }

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#041E42]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#041E42] transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <button
              onClick={() => { setLoading(true); fetchPurchases() }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#041E42] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {showCongrats && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-6 flex items-start gap-4">
            <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-green-800">Congrats on your purchase!</h2>
              <p className="text-sm text-green-700 mt-1">
                Your payment was successful. Remember to rate the seller once your transaction is complete
                — this releases the funds to the seller and closes the transaction.
              </p>
            </div>
            <button
              onClick={() => setShowCongrats(false)}
              className="text-green-400 hover:text-green-600 transition-colors text-xl leading-none"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        )}

        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
            {fetchError}
          </div>
        )}

        {!fetchError && purchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No purchases yet</p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const { label, cls } = statusLabel(purchase.status)
              // Only show Rate Seller when status is exactly 'paid' (payment confirmed, not yet rated).
              // 'completed' means the buyer already rated and funds were released.
              const canRate = purchase.status === 'paid' && !purchase.rating
              return (
                <div
                  key={purchase.id}
                  className="bg-white rounded-lg shadow-md p-6 flex items-center gap-6"
                >
                  {purchase.listings?.images?.[0] ? (
                    <img
                      src={purchase.listings.images[0]}
                      alt={purchase.listings?.title}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold mb-1">
                      {purchase.listings?.title || 'Item'}
                    </h3>
                    {purchase.seller?.username && (
                      <p className="text-gray-500 text-sm mb-1">
                        Seller: @{purchase.seller.username}
                      </p>
                    )}
                    <p className="text-lg font-bold text-[#041E42]">
                      ${parseFloat(purchase.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {/* Hide status badge once the buyer has rated (stars are shown instead) */}
                    {purchase.rating == null && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
                        {label}
                      </span>
                    )}

                    {canRate && (
                      <button
                        onClick={() => setSelectedTransaction(purchase)}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-4 py-2 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
                      >
                        <Star className="w-4 h-4" />
                        Rate Seller
                      </button>
                    )}

                    {purchase.rating != null && (
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < purchase.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedTransaction && (
          <RatingModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
            onComplete={handleRatingComplete}
          />
        )}
      </div>
    </div>
  )
}
