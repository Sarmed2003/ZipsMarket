import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, Plus, User, LogOut, MessageCircle, ShoppingCart, Inbox, Heart, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [likedListings, setLikedListings] = useState(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchListings()
      fetchLikedListings()
      fetchUnreadCount()
      setupRealtime()
    }
  }, [user])

  const fetchListings = async () => {
    try {
      // Fetch all listings - should be publicly visible regardless of user
      // First get listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('sold', false) // Only show unsold listings
        .order('created_at', { ascending: false })

      if (listingsError) throw listingsError

      // Then get profiles for all unique user_ids
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
      console.error('Error fetching listings:', error)
      // Show error to user
      alert('Error loading listings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const fetchLikedListings = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('listing_id')
        .eq('user_id', user.id)

      if (error) throw error
      setLikedListings(new Set(data?.map(l => l.listing_id) || []))
    } catch (error) {
      console.error('Error fetching liked listings:', error)
    }
  }

  const fetchUnreadCount = async () => {
    if (!user) return
    
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const setupRealtime = () => {
    if (!user) return

    const channel = supabase
      .channel('home-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleLike = async (listingId) => {
    if (!user) return

    const isLiked = likedListings.has(listingId)

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId)

        if (error) {
          console.error('Unlike error:', error)
          throw error
        }
        setLikedListings(prev => {
          const newSet = new Set(prev)
          newSet.delete(listingId)
          return newSet
        })
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            listing_id: listingId,
          })

        if (error) {
          console.error('Like error:', error)
          // Check if it's a duplicate key error (already liked)
          if (error.code === '23505') {
            // Already liked, just update state
            setLikedListings(prev => new Set(prev).add(listingId))
            return
          }
          throw error
        }
        setLikedListings(prev => new Set(prev).add(listingId))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      alert('Failed to like/unlike item: ' + (error.message || 'Please make sure the likes table exists in your database'))
    }
  }

  const filteredListings = listings.filter((listing) =>
    listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-[#A89968]/20 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center group">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-200">
                ZipsMarket
              </h1>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <Link
                to="/create-listing"
                className="flex items-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-4 py-2 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">List Item</span>
              </Link>
              <Link
                to="/messages"
                className="flex items-center gap-2 text-gray-700 hover:text-[#041E42] font-medium transition-colors px-3 py-2 rounded-lg hover:bg-[#A89968]/10 relative"
                title="Messages"
              >
                <Inbox className="w-5 h-5" />
                <span className="hidden sm:inline">Messages</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to="/following"
                className="flex items-center gap-2 text-gray-700 hover:text-[#041E42] font-medium transition-colors px-3 py-2 rounded-lg hover:bg-[#A89968]/10"
                title="Following"
              >
                <Users className="w-5 h-5" />
                <span className="hidden sm:inline">Following</span>
              </Link>
              <Link
                to="/likes"
                className="flex items-center gap-2 text-gray-700 hover:text-[#041E42] font-medium transition-colors px-3 py-2 rounded-lg hover:bg-[#A89968]/10"
                title="Likes"
              >
                <Heart className="w-5 h-5" />
                <span className="hidden sm:inline">Likes</span>
              </Link>
              <Link
                to="/purchases"
                className="hidden sm:block text-gray-700 hover:text-[#041E42] font-medium transition-colors px-3 py-2 rounded-lg hover:bg-[#A89968]/10"
              >
                Purchases
              </Link>
              <Link
                to="/profile"
                className="p-2 text-gray-700 hover:text-[#041E42] transition-colors rounded-lg hover:bg-[#A89968]/10"
                title="Profile"
              >
                <User className="w-6 h-6" />
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-700 hover:text-[#041E42] transition-colors rounded-lg hover:bg-[#A89968]/10"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading listings...</div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              {searchQuery ? 'No items found matching your search.' : 'No listings yet.'}
            </p>
            <Link
              to="/create-listing"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Create First Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => {
              const isOwner = user?.id === listing.user_id
              const isLiked = likedListings.has(listing.id)
              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200 flex flex-col relative"
                >
                  {/* Like button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleLike(listing.id)
                    }}
                    className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                    title={isLiked ? 'Remove from likes' : 'Add to likes'}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isLiked
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-600 hover:text-red-500'
                      } transition-colors`}
                    />
                  </button>

                  <Link to={`/listing/${listing.id}`} className="flex-1">
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
                        <p className="text-xs text-gray-500 mt-2">
                          {listing.profiles.email?.split('@')[0] || 'Seller'}
                        </p>
                      )}
                    </div>
                  </Link>
                  {!isOwner && (
                    <div className="p-4 pt-0 flex gap-2">
                      <button
                        onClick={() => navigate(`/chat/${listing.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message Seller
                      </button>
                      <button
                        onClick={() => navigate(`/chat/${listing.id}?buy=true`)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Buy Now
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
