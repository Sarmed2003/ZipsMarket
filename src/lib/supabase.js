import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabaseUrl = rawUrl
export const supabaseAnonKey = rawKey

export const isSupabaseConfigured = Boolean(rawUrl && rawKey)

let client = null
if (isSupabaseConfigured) {
  try {
    client = createClient(rawUrl, rawKey)
  } catch (err) {
    console.error('Supabase client init failed:', err.message)
  }
}
export const supabase = client
