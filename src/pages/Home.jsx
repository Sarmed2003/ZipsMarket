import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, Plus, User, LogOut, Inbox, Heart, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import ListingCard from '../components/ListingCard'
import ListingSkeleton from '../components/ListingSkeleton'
import FilterSidebar from '../components/FilterSidebar'
import FilterChips from '../components/FilterChips'

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [likedListings, setLikedListings] = useState(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false)
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const observerTarget = useRef(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const categories = ['Menswear', 'Womenswear', 'sneakers', 'College Items', 'accessories']
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'relevance', label: 'Relevance' }
  ]

  // Initialize filters from URL
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    categories: searchParams.get('categories')?.split(',') || [],
    priceMin: searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')) : null,
    priceMax: searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')) : null,
    conditions: searchParams.get('conditions')?.split(',') || [],
  })

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('q', filters.search)
    if (filters.categories.length > 0) params.set('categories', filters.categories.join(','))
    if (filters.priceMin) params.set('priceMin', filters.priceMin.toString())
    if (filters.priceMax) params.set('priceMax', filters.priceMax.toString())
    if (filters.conditions.length > 0) params.set('conditions', filters.conditions.join(','))
    if (sortBy !== 'newest') params.set('sort', sortBy)
    
    setSearchParams(params, { replace: true })
  }, [filters, sortBy, setSearchParams])

  // Debounced search
  const [searchQuery, setSearchQuery] = useState(filters.search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchQuery }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (user) {
      fetchListings(true)
      fetchLikedListings()
      fetchUnreadCount()
      setupRealtime()
    }
  }, [user, filters, sortBy])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchListings(false)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loadingMore, loading])

  const fetchListings = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true)
        setListings([])
      } else {
        setLoadingMore(true)
      }

      let query = supabase
        .from('listings')
        .select('*', { count: 'exact' })
        .eq('sold', false)

      // Apply filters
      if (filters.categories.length > 0) {
        query = query.in('category', filters.categories)
      }

      if (filters.priceMin) {
        query = query.gte('price', filters.priceMin)
      }

      if (filters.priceMax) {
        query = query.lte('price', filters.priceMax)
      }

      if (filters.conditions.length > 0) {
        query = query.in('condition', filters.conditions)
      }

      // Search filter
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Sort
      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false })
          break
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false })
          break
      }

      // Pagination
      const pageSize = 20
      const offset = reset ? 0 : listings.length
      query = query.range(offset, offset + pageSize - 1)

      const { data: listingsData, error: listingsError, count } = await query

      if (listingsError) throw listingsError

      // Fetch profiles
      const userIds = [...new Set(listingsData?.map(l => l.user_id) || [])]
      let profilesMap = {}
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, profile_picture, bio, username')
          .in('id', userIds)

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile
            return acc
          }, {})
        }
      }

      // Combine listings with profiles
      const listingsWithProfiles = listingsData?.map(listing => ({
        ...listing,
        profiles: profilesMap[listing.user_id] || null
      })) || []

      if (reset) {
        setListings(listingsWithProfiles)
      } else {
        setListings(prev => [...prev, ...listingsWithProfiles])
      }

      setHasMore(listingsWithProfiles.length === pageSize)
    } catch (error) {
      console.error('Error fetching listings:', error)
      alert('Error loading listings: ' + error.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
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

    // Optimistic update
    setLikedListings(prev => {
      const newSet = new Set(prev)
      if (isLiked) {
        newSet.delete(listingId)
      } else {
        newSet.add(listingId)
      }
      return newSet
    })

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            listing_id: listingId,
          })

        if (error && error.code !== '23505') throw error
      }
    } catch (error) {
      // Revert optimistic update on error
      setLikedListings(prev => {
        const newSet = new Set(prev)
        if (isLiked) {
          newSet.add(listingId)
        } else {
          newSet.delete(listingId)
        }
        return newSet
      })
      console.error('Error toggling like:', error)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setListings([])
    setHasMore(true)
  }

  const handleRemoveFilter = (type, value) => {
    const newFilters = { ...filters }
    if (type === 'category') {
      newFilters.categories = newFilters.categories.filter(c => c !== value)
    } else if (type === 'condition') {
      newFilters.conditions = newFilters.conditions.filter(c => c !== value)
    } else if (type === 'priceMin') {
      newFilters.priceMin = null
    } else if (type === 'priceMax') {
      newFilters.priceMax = null
    }
    handleFilterChange(newFilters)
  }

  const handleClearAll = () => {
    const clearedFilters = {
      search: '',
      categories: [],
      priceMin: null,
      priceMax: null,
      conditions: [],
    }
    setSearchQuery('')
    handleFilterChange(clearedFilters)
  }

  const activeCategory = filters.categories.length === 1 ? filters.categories[0] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-[#A89968]/20 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center group">
              <h1 className="text-2xl font-extrabold zips-wordmark animate-zips group-hover:opacity-90 transition-opacity duration-200">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
                />
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
                className="lg:hidden p-2 text-gray-700 hover:text-[#041E42] transition-colors rounded-lg hover:bg-[#A89968]/10"
                title="Filters"
              >
                <SlidersHorizontal className="w-6 h-6" />
              </button>
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
                to="/likes"
                className="flex items-center gap-2 text-gray-700 hover:text-[#041E42] font-medium transition-colors px-3 py-2 rounded-lg hover:bg-[#A89968]/10"
                title="Likes"
              >
                <Heart className="w-5 h-5" />
                <span className="hidden sm:inline">Likes</span>
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
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterSidebar
            isOpen={filterSidebarOpen}
            onClose={() => setFilterSidebarOpen(false)}
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories}
            onClearAll={handleClearAll}
          />

          {/* Content Area */}
          <div className="flex-1">
            {/* Category buttons (moved under header, Grailed-style) */}
            <div className="mb-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <button
                  onClick={() => {
                    handleFilterChange({ ...filters, categories: [] })
                  }}
                  className={`h-9 w-full rounded-lg text-sm font-semibold transition-colors border ${
                    filters.categories.length === 0
                      ? 'bg-[#041E42] text-white border-[#041E42]'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      handleFilterChange({ ...filters, categories: [category] })
                    }}
                    className={`h-9 w-full rounded-lg text-sm font-semibold transition-colors border ${
                      activeCategory === category
                        ? 'bg-[#041E42] text-white border-[#041E42]'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort and Results Count */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  {loading ? 'Loading...' : `${listings.length} ${listings.length === 1 ? 'item' : 'items'}`}
                </p>
                <FilterChips
                  filters={filters}
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={handleClearAll}
                />
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    setListings([])
                    setHasMore(true)
                  }}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Listings Grid */}
            {loading && listings.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <ListingSkeleton key={i} />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">
                  {filters.search || filters.categories.length > 0 || filters.priceMin || filters.priceMax || filters.conditions.length > 0
                    ? 'No items found matching your filters.'
                    : 'No listings yet.'}
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isLiked={likedListings.has(listing.id)}
                      onLike={handleLike}
                      isOwner={user?.id === listing.user_id}
                      user={user}
                    />
                  ))}
                </div>
                
                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={observerTarget} className="mt-8">
                    {loadingMore && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                          <ListingSkeleton key={i} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}