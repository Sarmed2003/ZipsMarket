import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Upload, X } from 'lucide-react'

export default function CreateListing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [condition, setCondition] = useState('')
  const [images, setImages] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const categories = ['Menswear', 'Womenswear', 'sneakers', 'College Items', 'accessories']
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor']
  const sizes = {
    'Menswear': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'Womenswear': ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'sneakers': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'],
    'College Items': ['One Size', 'Small', 'Medium', 'Large'],
    'accessories': ['One Size', 'Small', 'Medium', 'Large']
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setImages((prev) => [...prev, e.target.result])
        }
        reader.readAsDataURL(file)
        setImageFiles((prev) => [...prev, file])
      }
    })
  }

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async () => {
    const uploadedUrls = []

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('listing-images').getPublicUrl(filePath)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!title || !description || !price || !category) {
        setError('Please fill in all fields including category')
        setLoading(false)
        return
      }

      if (images.length === 0) {
        setError('Please add at least one image')
        setLoading(false)
        return
      }

      const imageUrls = await uploadImages()

      const { data, error: insertError } = await supabase
        .from('listings')
        .insert({
          title,
          description,
          price: parseFloat(price),
          category,
          brand: brand || null,
          size: size || null,
          condition: condition || null,
          images: imageUrls,
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      navigate(`/listing/${data.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create listing')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Listing</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Vintage Leather Jacket"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Price ($) *
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setSize('') // Reset size when category changes
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Nike, Adidas, Zara"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                disabled={!category}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select size</option>
                {category && sizes[category]?.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <select
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select condition</option>
                {conditions.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your item in detail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images * (Max 5)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={img} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {images.length === 0 && (
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <span className="text-gray-600">Click to upload images</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
