import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Send } from 'lucide-react'

export default function Chat() {
  const { id: listingId } = useParams()
  const [searchParams] = useSearchParams()
  const buyNow = searchParams.get('buy') === 'true'
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (listingId) {
      fetchListing()
      fetchMessages()
      const unsubscribe = setupRealtime()
      return () => {
        if (unsubscribe) unsubscribe()
      }
    }
  }, [listingId, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchListing = async () => {
    try {
      // Fetch listing
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single()

      if (listingError) throw listingError
      
      if (!listingData) {
        console.error('Listing not found')
        return
      }

      setListing(listingData)

      // Determine other user (seller if buyer, buyer if seller)
      const otherUserId = listingData.user_id === user.id ? null : listingData.user_id
      if (otherUserId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single()
        setOtherUser(profileData || null)
      } else {
        // If we're the seller, we need to get buyer info from messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select('sender_id, receiver_id')
          .eq('listing_id', listingId)
          .limit(1)
          
        if (messagesData && messagesData.length > 0) {
          const buyerId = messagesData[0].sender_id === user.id 
            ? messagesData[0].receiver_id 
            : messagesData[0].sender_id
          
          if (buyerId) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', buyerId)
              .single()
            setOtherUser(profileData || null)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching listing:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      // Fetch profiles for all senders (including current user)
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])]
      // Also include current user to get their profile picture
      if (user?.id && !senderIds.includes(user.id)) {
        senderIds.push(user.id)
      }
      
      let profilesMap = {}
      
      if (senderIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, profile_picture')
          .in('id', senderIds)

        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile
            return acc
          }, {})
        }
      }

      // Combine messages with profiles
      const messagesWithProfiles = messagesData?.map(message => ({
        ...message,
        profiles: profilesMap[message.sender_id] || null
      })) || []

      setMessages(messagesWithProfiles)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setLoading(false)
    }
  }

  const setupRealtime = () => {
    if (!listingId) return
    
    const channel = supabase
      .channel(`messages:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          console.log('Message update received:', payload)
          fetchMessages()
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !listing) {
      console.log('Cannot send: message empty or listing missing', { newMessage: newMessage.trim(), listing })
      return
    }

    // Receiver is the seller (listing owner) if current user is buyer
    // If current user is seller, we need to find the buyer from messages
    let receiverId = listing.user_id
    
    if (listing.user_id === user.id) {
      // We're the seller, find the buyer from existing messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .eq('listing_id', listingId)
        .neq('sender_id', user.id)
        .limit(1)
        .single()
      
      if (messagesData) {
        receiverId = messagesData.sender_id === user.id ? messagesData.receiver_id : messagesData.sender_id
      } else {
        // No existing messages, can't determine buyer yet
        alert('Please wait for a buyer to message you first, or use the Buy Now button from the listing.')
        return
      }
    }

    try {
      const { error } = await supabase.from('messages').insert({
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: receiverId,
        message: newMessage.trim(),
      })

      if (error) {
        console.error('Error inserting message:', error)
        throw error
      }
      
      setNewMessage('')
      // Refresh messages to show the new one
      await fetchMessages()
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message: ' + error.message)
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <h1 className="font-semibold text-lg">
                {listing?.title || 'Chat'}
              </h1>
              {listing?.images?.[0] && (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                />
              )}
            </div>
            <p className="text-sm text-gray-600">
              {otherUser?.email?.split('@')[0] || (listing?.user_id === user.id ? 'Buyer' : 'Seller')}
            </p>
          </div>
          {buyNow && (
            <Link
              to={`/listing/${listingId}`}
              className="bg-gradient-to-r from-[#041E42] to-[#031832] text-white px-4 py-2 rounded-lg hover:from-[#031832] hover:to-[#041E42] transition-all"
            >
              Complete Purchase
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 py-6">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === user.id
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-gradient-to-r from-[#041E42] to-[#031832] text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-white/70' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e)
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#041E42] focus:border-transparent resize-none"
                style={{ maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || !listing}
              className="bg-gradient-to-r from-[#041E42] to-[#031832] text-white p-3 rounded-full hover:from-[#031832] hover:to-[#041E42] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
