import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, UserPlus, UserCheck, Heart, Edit2 } from 'lucide-react'

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [likesCount, setLikesCount] = useState(0)

  useEffect(() => {
    fetchListing()
  }, [id])

  useEffect(() => {
    if (listing && user) {
      checkFollowingStatus()
      fetchLikesCount()
    }
  }, [listing, user])

  const fetchLikesCount = async () => {
    if (!listing) return
    
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', listing.id)

      if (error) throw error
      setLikesCount(count || 0)
    } catch (error) {
      console.error('Error fetching likes count:', error)
    }
  }

  const fetchListing = async () => {
    try {
      // Fetch listing first
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single()

      if (listingError) {
        console.error('Error fetching listing:', listingError)
        throw listingError
      }

      if (!listingData) {
        throw new Error('Listing not found')
      }

      // Fetch profile for the seller
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, profile_picture, bio')
        .eq('id', listingData.user_id)
        .single()

      // Combine listing with profile (profile might not exist yet)
      setListing({
        ...listingData,
        profiles: profileData || {
          id: listingData.user_id,
          email: 'Unknown',
          profile_picture: null,
          bio: null
        }
      })
    } catch (error) {
      console.error('Error fetching listing:', error)
      setListing(null)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowingStatus = async () => {
    if (!listing || !user || listing.user_id === user.id) return
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', listing.user_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setIsFollowing(!!data)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!listing || !user || listing.user_id === user.id) return

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', listing.user_id)

        if (error) throw error
        setIsFollowing(false)
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: listing.user_id,
          })

        if (error) throw error
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      alert('Failed to follow/unfollow user')
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
            {/* Image Gallery - Grailed Style */}
            <div>
              <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4 relative group">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentImageIndex]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          →
                        </button>
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index
                          ? 'border-[#041E42] ring-2 ring-[#A89968]'
                          : 'border-transparent hover:border-gray-300'
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
              <p className="text-4xl font-bold bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent mb-4">
                ${parseFloat(listing.price).toFixed(2)}
              </p>
              <div className="flex items-center gap-2 mb-6 text-gray-600">
                <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                <span className="font-semibold">{likesCount}</span>
                <span className="text-sm">likes</span>
              </div>

              {/* Product Details */}
              <div className="space-y-4 mb-6">
                {listing.brand && (
                  <div>
                    <span className="text-sm text-gray-600">Brand:</span>
                    <span className="ml-2 font-semibold text-gray-900">{listing.brand}</span>
                  </div>
                )}
                {listing.size && (
                  <div>
                    <span className="text-sm text-gray-600">Size:</span>
                    <span className="ml-2 font-semibold text-gray-900">{listing.size}</span>
                  </div>
                )}
                {listing.condition && (
                  <div>
                    <span className="text-sm text-gray-600">Condition:</span>
                    <span className="ml-2 font-semibold text-gray-900">{listing.condition}</span>
                  </div>
                )}
                {listing.category && (
                  <div>
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="ml-2 font-semibold text-gray-900">{listing.category}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b py-6 my-6">
                <h2 className="text-xl font-semibold mb-4">Product Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </div>

              {listing.profiles && !isOwner && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {listing.profiles.profile_picture ? (
                      <img
                        src={listing.profiles.profile_picture}
                        alt={listing.profiles.email}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#A89968]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#041E42] to-[#A89968] flex items-center justify-center text-white font-semibold border-2 border-[#A89968]">
                        {listing.profiles.email?.charAt(0).toUpperCase() || 'S'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Seller</p>
                      <p className="font-semibold text-gray-900">
                        {listing.profiles.email?.split('@')[0] || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleFollow}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-gradient-to-r from-[#041E42] to-[#031832] text-white hover:from-[#031832] hover:to-[#041E42]'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-5 h-5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              {listing.profiles && isOwner && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Your Listing</p>
                </div>
              )}

              {!isOwner && (
                <Link
                  to={`/checkout/${listing.id}`}
                  className="block w-full bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-center"
                >
                  Purchase Item
                </Link>
              )}

              {isOwner && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-blue-900 font-medium">This is your listing</p>
                    <button
                      onClick={() => navigate(`/listing/${listing.id}/edit`)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-4 py-2 rounded-lg hover:from-[#031832] hover:to-[#041E42] transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Listing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
