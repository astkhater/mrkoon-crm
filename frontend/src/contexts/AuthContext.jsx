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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
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

  const isAdmin     = profile?.is_admin === true
  const _previewRole = (isAdmin && localStorage.getItem('crm_preview_role')) || null
  const role        = _previewRole || profile?.role || null
  const isCCO       = role === 'cco'
  const isCEO       = role === 'ceo'
  const isCOO       = role === 'coo'
  const isTL        = role === 'bd_tl'
  const isBDRep     = role === 'bd_rep'
  const isAM        = role === 'bd_am'
  const isKSAClevel = role === 'ksa_clevel'
  const isModerator = role === 'moderator'
  const isExecutive = isCCO || isCEO || isCOO || isKSAClevel
  const isManager   = isCCO || isTL || isKSAClevel
  const canImport   = isCCO || isTL || isCEO || isCOO || isKSAClevel || profile?.can_import === true
  const isBDMode    = isExecutive && viewMode === 'bd-working'

  const entityFilter = (() => {
    if (!profile) return null
    if ((isCEO || isCOO) && isBDMode) return 'KSA'
    if (isCCO || isCEO || isCOO) return entityView === 'holding' ? null : entityView
    if (isKSAClevel) {
      const ev = entityView === 'EG' ? 'KSA' : entityView
      return ev === 'holding' ? null : ev
    }
    return profile.entity || 'EG'
  })()

  return (
    <AuthContext.Provider value={{
      session, profile, loading,
      signIn, signOut, resetPassword,
      role, isAdmin, isCCO, isCEO, isCOO, isTL, isBDRep, isAM, isKSAClevel, isModerator,
      isExecutive, isManager, canImport, isBDMode,
      viewMode, entityView, setViewMode, setEntityView, entityFilter,
      userId: session?.user?.id ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
