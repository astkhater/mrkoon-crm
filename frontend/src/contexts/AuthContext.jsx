/**
 * AuthContext — Supabase session + profile + role + admin/exec state
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(undefined)
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [viewMode,   setViewModeState]   = useState(() => localStorage.getItem('crm_view_mode')   || 'dashboard')
  const [entityView, setEntityViewState] = useState(() => localStorage.getItem('crm_entity_view') || 'EG')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (!error) setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  async function signOut() { await supabase.auth.signOut() }
  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) throw error
  }

  function setViewMode(mode) {
    setViewModeState(mode)
    localStorage.setItem('crm_view_mode', mode)
  }
  function setEntityView(entity) {
    setEntityViewState(entity)
    localStorage.setItem('crm_entity_view', entity)
  }

  const role        = profile?.role ?? null
  const isAdmin     = profile?.is_admin === true
  const isCCO       = role === 'cco'
  const isCEO       = role === 'ceo'
  const isCOO       = role === 'coo'
  const isTL        = role === 'bd_tl'
  const isBDRep     = role === 'bd_rep'
  const isAM        = role === 'bd_am'
  const isExecutive = isCCO || isCEO || isCOO
  const isManager   = isCCO || isTL
  const canImport   = isCCO || isTL || isCEO || isCOO || profile?.can_import === true
  const isBDMode    = isExecutive && viewMode === 'bd-working'

  return (
    <AuthContext.Provider value={{
      session, profile, loading,
      signIn, signOut, resetPassword,
      role, isAdmin, isCCO, isCEO, isCOO, isTL, isBDRep, isAM,
      isExecutive, isManager, canImport, isBDMode,
      viewMode, entityView, setViewMode, setEntityView,
      userId: session?.user?.id ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}