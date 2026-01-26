import { Link } from 'react-router-dom'
import { Heart, MessageCircle, ShoppingCart } from 'lucide-react'

export default function ListingCard({ listing, isLiked, onLike, isOwner, user }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-200 flex flex-col relative group">
      {/* Like button - Grailed style */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onLike(listing.id)
        }}
        className={`absolute top-3 right-3 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all ${
        isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
        title={isLiked ? 'Remove from saved' : 'Save item'}
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            isLiked
              ? 'fill-red-500 text-red-500'
              : 'text-gray-600 hover:text-red-500'
          }`}
        />
      </button>

      <Link to={`/listing/${listing.id}`} className="flex-1">
        {/* Image */}
        <div className="aspect-square bg-gray-200 relative overflow-hidden">
          {listing.images && listing.images.length > 0 ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>

        {/* Listing Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-base text-gray-900 line-clamp-2 flex-1">
              {listing.title}
            </h3>
          </div>
          
          {listing.brand && (
            <p className="text-sm text-gray-500 mb-1">{listing.brand}</p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold bg-gradient-to-r from-[#041E42] to-[#A89968] bg-clip-text text-transparent">
              ${parseFloat(listing.price).toFixed(2)}
            </p>
            {listing.size && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {listing.size}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Action Buttons */}
      {!isOwner && user && (
        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault()
              window.location.href = `/chat/${listing.id}`
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              window.location.href = `/checkout/${listing.id}`
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-2 px-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy
          </button>
        </div>
      )}
    </div>
  )
}