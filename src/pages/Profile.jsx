import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Package, Star, DollarSign, Edit2, Upload, X } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [sales, setSales] = useState([])
  const [rating, setRating] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [profilePicture, setProfilePicture] = useState('')
  const [bio, setBio] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') throw profileError
      setProfile(profileData)
      if (profileData) {
        setProfilePicture(profileData.profile_picture || '')
        setBio(profileData.bio || '')
      }

      // Fetch user's listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (listingsError) throw listingsError
      setListings(listingsData || [])

      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('transactions')
        .select('*, listings(*)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (salesError) throw salesError
      setSales(salesData || [])

      // Fetch seller rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('seller_ratings')
        .select('*')
        .eq('seller_id', user.id)
        .single()

      if (ratingError && ratingError.code !== 'PGRST116') {
        throw ratingError
      }
      setRating(ratingData)
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      const filePath = `profile-pictures/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('listing-images').getPublicUrl(filePath)

      setProfilePicture(publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setUploading(true)
      
      // Use UPDATE instead of UPSERT to respect RLS policy
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_picture: profilePicture || null,
          bio: bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error('Profile save error:', error)
        // If profile doesn't exist, create it first
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              profile_picture: profilePicture || null,
              bio: bio || null,
            })
          
          if (insertError) {
            alert('Error saving profile: ' + insertError.message)
            throw insertError
          }
        } else {
          alert('Error saving profile: ' + error.message)
          throw error
        }
      }
      
      setEditing(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const totalEarnings = sales
    .filter((sale) => sale.funds_released)
    .reduce((sum, sale) => sum + parseFloat(sale.amount), 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#A89968]/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#041E42] to-[#A89968] flex items-center justify-center text-white text-2xl font-bold border-4 border-[#A89968]/20">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-[#041E42] text-white p-2 rounded-full cursor-pointer hover:bg-[#031832] transition-colors">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
                <p className="text-gray-600">{user.email}</p>
                {bio && !editing && (
                  <p className="text-gray-700 mt-3 max-w-2xl">{bio}</p>
                )}
              </div>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-[#041E42] hover:text-[#A89968] transition-colors"
              >
                <Edit2 className="w-5 h-5" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false)
                    setProfilePicture(profile?.profile_picture || '')
                    setBio(profile?.bio || '')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={uploading}
                  className="px-4 py-2 bg-gradient-to-r from-[#041E42] to-[#031832] text-white rounded-lg hover:from-[#031832] hover:to-[#041E42] transition-all disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editing && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio / About Me
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell other users about yourself..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">Share a bit about yourself to help build trust with buyers and sellers.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#041E42]/10 to-[#A89968]/10 rounded-xl p-6 border border-[#A89968]/20 shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-[#041E42]" />
                <h3 className="text-lg font-semibold text-gray-900">Active Listings</h3>
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent">
                {listings.filter((l) => !l.sold).length}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6 text-green-900" />
                <h3 className="text-lg font-semibold text-gray-900">Total Earnings</h3>
              </div>
              <p className="text-3xl font-bold text-green-900">${totalEarnings.toFixed(2)}</p>
            </div>

            <div className="bg-gradient-to-br from-[#A89968]/10 to-[#041E42]/10 rounded-xl p-6 border border-[#A89968]/20 shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-6 h-6 text-[#A89968]" />
                <h3 className="text-lg font-semibold text-gray-900">Seller Rating</h3>
              </div>
              {rating ? (
                <div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-[#A89968] to-[#041E42] bg-clip-text text-transparent">
                    {rating.average_rating.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    ({rating.total_ratings} {rating.total_ratings === 1 ? 'rating' : 'ratings'})
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">No ratings yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* My Listings */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
              <Link
                to="/create-listing"
                className="bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-4 py-2 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                + New Listing
              </Link>
            </div>
            <div className="space-y-4">
              {listings.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 mb-4">No listings yet</p>
                  <Link
                    to="/create-listing"
                    className="inline-block bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Create Your First Listing
                  </Link>
                </div>
              ) : (
                listings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/listing/${listing.id}`}
                    className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
                  >
                    {listing.images?.[0] && (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{listing.title}</h3>
                      <p className="bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent font-bold">${parseFloat(listing.price).toFixed(2)}</p>
                      {listing.sold && (
                        <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          Sold
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* My Sales */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Sales</h2>
            <div className="space-y-4">
              {sales.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600">No sales yet</p>
                </div>
              ) : (
                sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4"
                  >
                    {sale.listings?.images?.[0] && (
                      <img
                        src={sale.listings.images[0]}
                        alt={sale.listings.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{sale.listings?.title || 'Item'}</h3>
                      <p className="text-green-900 font-bold">${parseFloat(sale.amount).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                          sale.funds_released
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {sale.funds_released ? 'Funds Released' : 'Pending Rating'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
