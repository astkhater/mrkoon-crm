/**
 * AppContext — theme, language, and toast notifications
 * Wraps the whole app. Reads/writes user_settings via Supabase.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translations } from '@/lib/i18n'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, setThemeState]   = useState(() => localStorage.getItem('crm_theme') || 'auto')
  const [lang,  setLangState]    = useState(() => localStorage.getItem('crm_lang')  || 'en')
  const [toasts, setToasts]      = useState([])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('crm_theme', theme)
  }, [theme])

  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
    localStorage.setItem('crm_lang', lang)
    document.body.className = lang === 'ar' ? 'font-ar' : ''
  }, [lang])

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key
  }, [lang])

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

export const useT    = () => useApp().t
export const useLang = () => useApp()
export const useToast = () => useApp().toast