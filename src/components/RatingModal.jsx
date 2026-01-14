import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Star, X } from 'lucide-react'

export default function RatingModal({ transaction, onClose, onComplete }) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Update transaction with rating
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          rating,
          review,
        })
        .eq('id', transaction.id)

      if (updateError) throw updateError

      // Create or update seller rating
      const { data: existingRating, error: fetchError } = await supabase
        .from('seller_ratings')
        .select('*')
        .eq('seller_id', transaction.seller_id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existingRating) {
        // Update existing rating
        const totalRatings = existingRating.total_ratings + 1
        const newAverage =
          (existingRating.average_rating * existingRating.total_ratings + rating) / totalRatings

        await supabase
          .from('seller_ratings')
          .update({
            average_rating: newAverage,
            total_ratings: totalRatings,
          })
          .eq('seller_id', transaction.seller_id)
      } else {
        // Create new rating
        await supabase.from('seller_ratings').insert({
          seller_id: transaction.seller_id,
          average_rating: rating,
          total_ratings: 1,
        })
      }

      // Release funds to seller (update transaction status)
      await supabase
        .from('transactions')
        .update({ status: 'completed', funds_released: true })
        .eq('id', transaction.id)

      // TODO: Send email notification to seller about released funds
      // This would be done via a Supabase Edge Function or external service

      onComplete()
    } catch (err) {
      setError(err.message || 'Failed to submit rating')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Rate Your Purchase</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you rate this seller?
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
              Share your experience (optional)
            </label>
            <textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell others about your experience with this seller..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
