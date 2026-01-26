import { X } from 'lucide-react'

export default function FilterChips({ filters, onRemoveFilter, onClearAll }) {
  const activeFilters = []

  if (filters.categories?.length > 0) {
    filters.categories.forEach(cat => {
      activeFilters.push({ type: 'category', value: cat, label: cat })
    })
  }

  if (filters.priceMin) {
    activeFilters.push({ type: 'priceMin', value: filters.priceMin, label: `Min $${filters.priceMin}` })
  }

  if (filters.priceMax) {
    activeFilters.push({ type: 'priceMax', value: filters.priceMax, label: `Max $${filters.priceMax}` })
  }

  if (filters.conditions?.length > 0) {
    filters.conditions.forEach(cond => {
      activeFilters.push({ type: 'condition', value: cond, label: cond })
    })
  }

  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-gray-600">Active filters:</span>
      {activeFilters.map((filter, index) => (
        <button
          key={index}
          onClick={() => onRemoveFilter(filter.type, filter.value)}
          className="flex items-center gap-1 px-3 py-1 bg-[#041E42]/10 text-[#041E42] rounded-full text-sm hover:bg-[#041E42]/20 transition-colors"
        >
          {filter.label}
          <X className="w-3 h-3" />
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-600 hover:text-[#041E42] underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
}