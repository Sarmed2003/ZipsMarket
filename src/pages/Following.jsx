import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, Heart } from 'lucide-react'

export default function Following() {
  const { user } = useAuth()
  const [followingIds, setFollowingIds] = useState(new Set())
  const [followingUsers, setFollowingUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchFollowing()
    }
  }, [user])

  const fetchFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (error) throw error
      const ids = new Set(data?.map(f => f.following_id) || [])
      setFollowingIds(ids)
      
      // Fetch user profiles for those being followed
      if (ids.size > 0) {
        const followingArray = Array.from(ids)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, profile_picture, bio')
          .in('id', followingArray)

        if (profilesError) throw profilesError
        setFollowingUsers(profilesData || [])
      } else {
        setFollowingUsers([])
      }
    } catch (error) {
      console.error('Error fetching following:', error)
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

        {followingUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">Not following anyone yet</p>
            <p className="text-gray-500 mb-6">
              Follow other users to see them here. Click on a user's profile to follow them.
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
            {followingUsers.map((followedUser) => (
              <div
                key={followedUser.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow duration-200"
              >
                <div className="flex flex-col items-center text-center">
                  {followedUser.profile_picture ? (
                    <img
                      src={followedUser.profile_picture}
                      alt={followedUser.email}
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#A89968] mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#041E42] to-[#A89968] flex items-center justify-center text-white text-3xl font-semibold border-4 border-[#A89968] mb-4">
                      {followedUser.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <h3 className="font-semibold text-xl text-gray-900 mb-2">
                    {followedUser.email?.split('@')[0] || 'User'}
                  </h3>
                  {followedUser.bio && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {followedUser.bio}
                    </p>
                  )}
                  <Link
                    to="/"
                    className="text-sm text-[#041E42] hover:underline font-medium"
                  >
                    View Listings →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

