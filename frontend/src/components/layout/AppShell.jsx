import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import OnboardingTour from '@/components/onboarding/OnboardingTour'
import { useAuth } from '@/contexts/AuthContext'

/**
 * AppShell — persistent frame for all authenticated pages.
 * Sidebar (desktop) + main area (topbar + page content).
 * Onboarding tour fires on first login (localStorage flag).
 */
export default function AppShell() {
  const { role } = useAuth()
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    if (!role) return
    const done = localStorage.getItem('crm_onboarding_done')
    if (!done) setShowTour(true)
  }, [role])

  return (
    <div className="app-shell">
      <Sidebar onShowTour={() => setShowTour(true)} />
      <div className="main-area">
        <Outlet />
      </div>
      {showTour && role && (
        <OnboardingTour role={role} onClose={() => setShowTour(false)} />
      )}
    </div>
  )
}