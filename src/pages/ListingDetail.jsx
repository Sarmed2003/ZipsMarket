import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Heart, MessageCircle, Star } from 'lucide-react'
import { Elements } from '@stripe/react-stripe-js'
import stripePromise from '../lib/stripe'
import CheckoutForm from '../components/CheckoutForm'

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showCheckout, setShowCheckout] = useState(false)

  useEffect(() => {
    fetchListing()
  }, [id])

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      setListing(data)
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const images = listing.images || []
  const isOwner = user?.id === listing.user_id

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Image Gallery */}
            <div>
              <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4">
                {images.length > 0 ? (
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 ${
                        currentImageIndex === index
                          ? 'border-blue-900'
                          : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt={`${listing.title} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{listing.title}</h1>
              <p className="text-4xl font-bold bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent mb-6">
                ${parseFloat(listing.price).toFixed(2)}
              </p>

              <div className="border-t border-b py-6 my-6">
                <h2 className="text-xl font-semibold mb-4">Product Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </div>

              {listing.profiles && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Seller</p>
                  <p className="font-semibold">
                    {listing.profiles.email?.split('@')[0] || 'Unknown'}
                  </p>
                </div>
              )}

              {!isOwner && !showCheckout && (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  Purchase Item
                </button>
              )}

              {showCheckout && (
                <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Complete Purchase</h3>
                  <Elements stripe={stripePromise}>
                    <CheckoutForm
                      listing={listing}
                      onSuccess={() => {
                        setShowCheckout(false)
                        navigate('/purchases')
                      }}
                    />
                  </Elements>
                </div>
              )}

              {isOwner && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-900">This is your listing</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
