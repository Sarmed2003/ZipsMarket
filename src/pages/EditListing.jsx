import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Upload, X, Save, Trash2 } from 'lucide-react'
import BackButton from '../components/BackButton'

export default function EditListing() {
  const { id: listingId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [condition, setCondition] = useState('')

  // Images: existing URLs + newly selected files
  const [images, setImages] = useState([]) // array of urls (existing + uploaded later)
  const [newImagePreviews, setNewImagePreviews] = useState([]) // data URLs
  const [newImageFiles, setNewImageFiles] = useState([]) // File[]

  const categories = useMemo(
    () => ['Menswear', 'Womenswear', 'sneakers', 'College Items', 'accessories'],
    []
  )
  const conditions = useMemo(() => ['New', 'Like New', 'Good', 'Fair', 'Poor'], [])
  const sizes = useMemo(
    () => ({
      Menswear: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      Womenswear: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
      sneakers: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'],
      'College Items': ['One Size', 'Small', 'Medium', 'Large'],
      accessories: ['One Size', 'Small', 'Medium', 'Large'],
    }),
    []
  )

  useEffect(() => {
    fetchListing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  const fetchListing = async () => {
    setError('')
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single()

      if (fetchError) throw fetchError
      if (!data) throw new Error('Listing not found')

      if (!user || data.user_id !== user.id) {
        throw new Error('You can only edit your own listings.')
      }

      setTitle(data.title || '')
      setDescription(data.description || '')
      setPrice(data.price != null ? String(data.price) : '')
      setCategory(data.category || '')
      setBrand(data.brand || '')
      setSize(data.size || '')
      setCondition(data.condition || '')
      setImages(Array.isArray(data.images) ? data.images : [])
    } catch (err) {
      setError(err?.message || 'Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  const handleNewImagesSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const totalCount = images.length + newImagePreviews.length + files.length
    if (totalCount > 5) {
      setError('Maximum 5 images allowed')
      return
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (evt) => {
        setNewImagePreviews((prev) => [...prev, evt.target.result])
      }
      reader.readAsDataURL(file)
      setNewImageFiles((prev) => [...prev, file])
    })
  }

  const removeExistingImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index) => {
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadNewImages = async () => {
    const uploadedUrls = []
    for (const file of newImageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('listing-images').getPublicUrl(filePath)

      uploadedUrls.push(publicUrl)
    }
    return uploadedUrls
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim() || !description.trim() || !price || !category) {
      setError('Please fill in Title, Description, Price, and Category.')
      return
    }

    const remainingCount = images.length + newImagePreviews.length
    if (remainingCount === 0) {
      setError('Please keep at least one image.')
      return
    }

    setSaving(true)
    try {
      const uploadedUrls = await uploadNewImages()
      const finalImages = [...images, ...uploadedUrls]

      const { error: updateError } = await supabase
        .from('listings')
        .update({
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price),
          category,
          brand: brand ? brand.trim() : null,
          size: size || null,
          condition: condition || null,
          images: finalImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      navigate(`/listing/${listingId}`)
    } catch (err) {
      setError(err?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setSaving(true)
    setError('')
    try {
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('user_id', user.id)
      if (deleteError) throw deleteError
      navigate('/profile')
    } catch (err) {
      setError(err?.message || 'Failed to delete listing')
    } finally {
      setSaving(false)
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setSize('')
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                disabled={!category}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Images (Max 5)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {images.map((url, index) => (
                <div key={`${url}-${index}`} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={url} alt={`Listing ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {newImagePreviews.map((img, index) => (
                <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={img} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {images.length + newImagePreviews.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#041E42] transition-colors">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleNewImagesSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
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
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

