import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle, ExternalLink, Loader2 } from 'lucide-react'

export default function StripeConnectBanner({ userId, stripeAccountId, onboardingComplete }) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [isOnboarded, setIsOnboarded] = useState(onboardingComplete)
  const [accountStatus, setAccountStatus] = useState(null)

  // On mount and when returning from Stripe onboarding, check account status
  useEffect(() => {
    if (stripeAccountId && !onboardingComplete) {
      checkStatus()
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_onboard') === 'complete') {
      checkStatus()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [stripeAccountId, onboardingComplete])

  const checkStatus = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/stripe-connect-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      setAccountStatus(data)
      if (data.chargesEnabled) {
        setIsOnboarded(true)
      }
    } catch (err) {
      console.error('Failed to check Stripe status:', err)
    } finally {
      setChecking(false)
    }
  }

  const startOnboarding = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe-connect-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (isOnboarded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-green-800">Stripe Payments Active</h3>
          <p className="text-sm text-green-700 mt-1">
            Your account is set up to receive payouts. When buyers purchase your items,
            funds are deposited directly to your bank account.
          </p>
        </div>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        <span className="text-gray-600 text-sm">Checking payment account status...</span>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <DollarSign className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800">Set Up Payouts to Get Paid</h3>
          <p className="text-sm text-amber-700 mt-1 mb-3">
            Connect your bank account through Stripe to receive payments when your items sell.
            Setup takes about 2 minutes. There is currently no platform commission —
            100% of the sale price goes directly to you.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-3">
              {error}
            </div>
          )}

          {stripeAccountId && !accountStatus?.detailsSubmitted && (
            <p className="text-xs text-amber-600 mb-2">
              You started onboarding but haven't finished. Click below to continue.
            </p>
          )}

          <button
            onClick={startOnboarding}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#041E42] to-[#031832] hover:from-[#031832] hover:to-[#041E42] text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-lg text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                {stripeAccountId ? 'Continue Setup' : 'Set Up Payments'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
