import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Star, Package } from 'lucide-react'
import RatingModal from '../components/RatingModal'
import BackButton from '../components/BackButton'

export default function Purchases() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, listings(*), profiles:seller_id(*)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRatingComplete = () => {
    setSelectedTransaction(null)
    fetchPurchases()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Purchases</h1>

        {purchases.length === 0 ? (
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
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-white rounded-lg shadow-md p-6 flex items-center gap-6"
              >
                {purchase.listings?.images?.[0] && (
                  <img
                    src={purchase.listings.images[0]}
                    alt={purchase.listings.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    {purchase.listings?.title || 'Item'}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    Seller: {purchase.profiles?.email?.split('@')[0] || 'Unknown'}
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    ${parseFloat(purchase.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Purchased: {new Date(purchase.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      purchase.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {purchase.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                  {purchase.status === 'paid' && !purchase.rating && (
                    <button
                      onClick={() => setSelectedTransaction(purchase)}
                      className="flex items-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-4 py-2 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <Star className="w-4 h-4" />
                      Rate Seller
                    </button>
                  )}
                  {purchase.rating && (
                    <div className="flex items-center gap-1">
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
            ))}
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
