import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MessageCircle, Package } from 'lucide-react'

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
    setupRealtime()
  }, [])

  const fetchConversations = async () => {
    try {
      // Get all messages where user is sender or receiver
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (messagesError) throw messagesError

      // Group messages by listing_id
      const conversationsMap = {}
      const listingIds = new Set()

      messagesData?.forEach((message) => {
        listingIds.add(message.listing_id)
        const key = message.listing_id
        if (!conversationsMap[key]) {
          conversationsMap[key] = {
            listing_id: message.listing_id,
            last_message: message,
            unread_count: 0,
          }
        }
        // Update if this message is newer
        if (new Date(message.created_at) > new Date(conversationsMap[key].last_message.created_at)) {
          conversationsMap[key].last_message = message
        }
        // Count unread messages
        if (!message.read && message.receiver_id === user.id) {
          conversationsMap[key].unread_count++
        }
      })

      // Fetch listing details for all conversations
      const listingsArray = Array.from(listingIds)
      if (listingsArray.length > 0) {
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('id, title, images, user_id, price')
          .in('id', listingsArray)

        if (listingsError) throw listingsError

        // Fetch profiles for all unique user IDs
        const userIds = new Set()
        listingsData?.forEach((listing) => {
          userIds.add(listing.user_id)
        })
        messagesData?.forEach((message) => {
          if (message.sender_id !== user.id) userIds.add(message.sender_id)
          if (message.receiver_id !== user.id) userIds.add(message.receiver_id)
        })

        const profilesArray = Array.from(userIds)
        let profilesMap = {}
        if (profilesArray.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, profile_picture')
            .in('id', profilesArray)

          if (!profilesError && profilesData) {
            profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile
              return acc
            }, {})
          }
        }

        // Combine conversations with listings and profiles
        const conversationsArray = Object.values(conversationsMap).map((conv) => {
          const listing = listingsData?.find((l) => l.id === conv.listing_id)
          const otherUserId =
            conv.last_message.sender_id === user.id
              ? conv.last_message.receiver_id
              : conv.last_message.sender_id
          const otherUser = profilesMap[otherUserId] || null

          return {
            ...conv,
            listing,
            other_user: otherUser,
            other_user_id: otherUserId,
          }
        })

        // Sort by last message time
        conversationsArray.sort(
          (a, b) =>
            new Date(b.last_message.created_at) - new Date(a.last_message.created_at)
        )

        setConversations(conversationsArray)
      } else {
        setConversations([])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtime = () => {
    const channel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id} OR receiver_id=eq.${user.id}`,
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent">
                ZipsMarket
              </h1>
            </Link>
            <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
            <Link
              to="/"
              className="text-gray-600 hover:text-[#041E42] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Conversations List */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No messages yet</p>
            <p className="text-gray-500 mb-6">
              Start a conversation by messaging a seller or waiting for buyers to message you.
            </p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-6 py-3 rounded-xl hover:from-[#031832] hover:to-[#041E42] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <Link
                key={conversation.listing_id}
                to={`/chat/${conversation.listing_id}`}
                className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                {conversation.listing?.images?.[0] ? (
                  <img
                    src={conversation.listing.images[0]}
                    alt={conversation.listing.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                      {conversation.listing?.title || 'Listing'}
                    </h3>
                    <span className="text-sm text-gray-500 ml-2">
                      {formatTime(conversation.last_message.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-1">
                    {conversation.other_user?.email?.split('@')[0] || 'User'}: {conversation.last_message.message}
                  </p>
                  {conversation.listing && (
                    <p className="text-sm font-semibold text-[#041E42]">
                      ${parseFloat(conversation.listing.price).toFixed(2)}
                    </p>
                  )}
                </div>

                {conversation.unread_count > 0 && (
                  <div className="bg-[#041E42] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                    {conversation.unread_count}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
