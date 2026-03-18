import { createContext, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const AuthContext = createContext({})

// DEV ONLY: Test email for development (remove before production)
const DEV_TEST_EMAIL = 'sarmedmahmood91903@gmail.com'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(isSupabaseConfigured && supabase))

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    
    if (!normalizedEmail.endsWith('@uakron.edu') && normalizedEmail !== DEV_TEST_EMAIL) {
      throw new Error('Only @uakron.edu email addresses are allowed')
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      console.error('Supabase signup error:', error)
      throw error
    }
    return data
  }

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.endsWith('@uakron.edu') && normalizedEmail !== DEV_TEST_EMAIL) {
      throw new Error('Only @uakron.edu email addresses are allowed')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) throw error
    return data
  }

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
