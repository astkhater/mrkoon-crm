/**
 * AppContext — theme, language, toast notifications, and global rep filter
 * Wraps the whole app. Reads/writes user_settings via Supabase.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translations } from '@/lib/i18n'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, setThemeState]   = useState(() => localStorage.getItem('crm_theme') || 'auto')
  const [lang,  setLangState]    = useState(() => localStorage.getItem('crm_lang')  || 'en')
  const [toasts, setToasts]      = useState([])

  // Global rep filter — CCO/exec can scope all pages to one rep
  const [repFilter,     setRepFilterState] = useState(() => localStorage.getItem('crm_rep_filter')      || '')
  const [repFilterName, setRepFilterName]  = useState(() => localStorage.getItem('crm_rep_filter_name') || '')

  const setRepFilter = useCallback((id, name) => {
    setRepFilterState(id   || '')
    setRepFilterName(name  || '')
    localStorage.setItem('crm_rep_filter',      id   || '')
    localStorage.setItem('crm_rep_filter_name', name || '')
  }, [])

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('crm_theme', theme)
  }, [theme])

  // Apply language direction to <html> element
  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
    localStorage.setItem('crm_lang', lang)
    // Switch font family via class
    document.body.className = lang === 'ar' ? 'font-ar' : ''
  }, [lang])

  // Translation helper
  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key
  }, [lang])

  // Toast system
  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <AppContext.Provider value={{
      theme, setTheme: setThemeState,
      lang,  setLang:  setLangState,
      isRTL: lang === 'ar',
      t,
      toast,
      toasts, dismissToast,
      repFilter, repFilterName, setRepFilter,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

// Shorthand hooks
export const useT    = () => useApp().t
export const useLang = () => useApp()
export const useToast = () => useApp().toast
