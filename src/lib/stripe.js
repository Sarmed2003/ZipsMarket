import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
// Only load Stripe when key exists; otherwise Elements will fail with "elements store" error
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

export default stripePromise
