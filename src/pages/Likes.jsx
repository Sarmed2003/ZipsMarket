import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Heart } from 'lucide-react'
import ListingCard from '../components/ListingCard'

export default function Likes() {
  const { user } = useAuth()
  const [likedListings, setLikedListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchLikedListings()
    }
  }, [user])

  const fetchLikedListings = async () => {
    try {
      // Get all liked listing IDs
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('listing_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (likesError) throw likesError

      if (!likesData || likesData.length === 0) {
        setLikedListings([])
        setLoading(false)
        return
      }

      // Fetch listing details for liked items
      const listingIds = likesData.map(like => like.listing_id)
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)
        .eq('sold', false)

      if (listingsError) throw listingsError

      // Fetch profiles for sellers
      const userIds = [...new Set(listingsData?.map(l => l.user_id) || [])]
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, profile_picture, bio')
        .in('id', userIds)

      if (profilesError) throw profilesError

      // Combine listings with profiles
      const listingsWithProfiles = listingsData?.map(listing => ({
        ...listing,
        profiles: profilesData?.find(p => p.id === listing.user_id) || null
      })) || []

      setLikedListings(listingsWithProfiles)
    } catch (error) {
      console.error('Error fetching liked listings:', error)
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">My Likes</h1>
        </div>

        {likedListings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No liked items yet</p>
            <p className="text-gray-500 mb-6">
              Start liking items you're interested in by clicking the heart icon on any listing.
            </p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {likedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isLiked={true}
                onLike={() => {}} // Liked items page, no toggle needed
                isOwner={user?.id === listing.user_id}
                user={user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

