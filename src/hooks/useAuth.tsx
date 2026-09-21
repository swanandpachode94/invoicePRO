import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Vendor, Salesman } from '@/types'

export type Role = 'vendor' | 'salesman' | null

interface AuthContextValue {
  user: User | null
  session: Session | null
  role: Role
  vendor: Vendor | null
  salesman: Salesman | null
  /** The vendor a salesman works under (null for vendor sessions, where `vendor` above is already that row). */
  employerVendor: Vendor | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [salesman, setSalesman] = useState<Salesman | null>(null)
  const [employerVendor, setEmployerVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setVendor(null)
      setSalesman(null)
      setEmployerVendor(null)
      return
    }
    const [{ data: vendorRow }, { data: salesmanRow }] = await Promise.all([
      supabase.from('vendors').select('*').eq('auth_user_id', userId).maybeSingle(),
      supabase.from('salesmen').select('*').eq('auth_user_id', userId).maybeSingle(),
    ])
    setVendor((vendorRow as Vendor) ?? null)
    setSalesman((salesmanRow as Salesman) ?? null)

    // Only an approved salesman's RLS grant lets this resolve; pending salesmen
    // get null here, which is fine since they can't reach any screen that needs it.
    if (salesmanRow) {
      const { data: employer } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', (salesmanRow as Salesman).vendor_id)
        .maybeSingle()
      setEmployerVendor((employer as Vendor) ?? null)
    } else {
      setEmployerVendor(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id)
  }, [loadProfile, session?.user.id])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (mounted) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadProfile(newSession?.user.id)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    role: vendor ? 'vendor' : salesman ? 'salesman' : null,
    vendor,
    salesman,
    employerVendor,
    loading,
    refreshProfile,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
