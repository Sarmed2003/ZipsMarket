import { X, SlidersHorizontal } from 'lucide-react'

export default function FilterSidebar({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange, 
  categories,
  onClearAll 
}) {
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor']
  
  if (!isOpen) return null

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed lg:sticky top-0 left-0 h-full w-80 bg-white shadow-xl z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:shadow-none
        overflow-y-auto
      `}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories?.includes(category) || false}
                    onChange={(e) => {
                      const newCategories = e.target.checked
                        ? [...(filters.categories || []), category]
                        : (filters.categories || []).filter(c => c !== category)
                      onFilterChange({ ...filters, categories: newCategories })
                    }}
                    className="w-4 h-4 text-[#041E42] border-gray-300 rounded focus:ring-[#041E42]"
                  />
                  <span className="text-sm text-gray-700">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                <input
                  type="number"
                  value={filters.priceMin || ''}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    priceMin: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="$0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                <input
                  type="number"
                  value={filters.priceMax || ''}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    priceMax: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="$1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#041E42] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Condition Filter */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Condition</h3>
            <div className="space-y-2">
              {conditions.map((condition) => (
                <label key={condition} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.conditions?.includes(condition) || false}
                    onChange={(e) => {
                      const newConditions = e.target.checked
                        ? [...(filters.conditions || []), condition]
                        : (filters.conditions || []).filter(c => c !== condition)
                      onFilterChange({ ...filters, conditions: newConditions })
                    }}
                    className="w-4 h-4 text-[#041E42] border-gray-300 rounded focus:ring-[#041E42]"
                  />
                  <span className="text-sm text-gray-700">{condition}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear All */}
          <button
            onClick={onClearAll}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </>
  )
}