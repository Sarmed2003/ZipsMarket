import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function BackButton({ to = -1, label = 'Back', className = '' }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`flex items-center gap-2 text-gray-600 hover:text-[#041E42] mb-6 ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
      {label}
    </button>
  )
}
