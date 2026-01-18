import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, Heart } from 'lucide-react'

export default function Following() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [followingIds, setFollowingIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchFollowing()
    }
  }, [user])

  useEffect(() => {
    if (followingIds.size > 0) {
      fetchFollowingListings()
    } else {
      setListings([])
      setLoading(false)
    }
  }, [followingIds])

  const fetchFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (error) throw error
      setFollowingIds(new Set(data?.map(f => f.following_id) || []))
    } catch (error) {
      console.error('Error fetching following:', error)
    }
  }

  const fetchFollowingListings = async () => {
    try {
      const followingArray = Array.from(followingIds)
      
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .in('user_id', followingArray)
        .eq('sold', false)
        .order('created_at', { ascending: false })

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

      setListings(listingsWithProfiles)
    } catch (error) {
      console.error('Error fetching following listings:', error)
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
          <Users className="w-8 h-8 text-[#041E42]" />
          <h1 className="text-3xl font-bold text-gray-900">Following</h1>
        </div>

        {followingIds.size === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">Not following anyone yet</p>
            <p className="text-gray-500 mb-6">
              Follow other users to see their listings here. Click on a user's profile to follow them.
            </p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Browse Listings
            </Link>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No active listings from people you follow</p>
            <p className="text-gray-500 mb-6">
              The users you follow haven't posted any active listings yet.
            </p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Browse All Listings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200"
              >
                <div className="aspect-square bg-gray-200 relative overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1 truncate">
                    {listing.title}
                  </h3>
                  <p className="text-2xl font-bold bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent mb-2">
                    ${parseFloat(listing.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">{listing.description}</p>
                  {listing.profiles && (
                    <div className="flex items-center gap-2 mt-2">
                      {listing.profiles.profile_picture ? (
                        <img
                          src={listing.profiles.profile_picture}
                          alt={listing.profiles.email}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#041E42] to-[#A89968] flex items-center justify-center text-white text-xs font-semibold">
                          {listing.profiles.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        {listing.profiles.email?.split('@')[0] || 'Seller'}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
