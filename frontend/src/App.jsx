import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useApp }  from '@/contexts/AppContext'

// Layout
import AppShell from '@/components/layout/AppShell'
import ToastContainer from '@/components/ui/ToastContainer'

// Auth screens
import Login         from '@/pages/auth/Login'
import ResetPassword from '@/pages/auth/ResetPassword'

// Role dashboards
import CCODashboard       from '@/pages/cco/Dashboard'
import BDDashboard        from '@/pages/bd/Dashboard'
import AMDashboard        from '@/pages/am/Dashboard'
import ExecutiveDashboard from '@/pages/executive/Dashboard'
import AdminPanel         from '@/pages/admin/AdminPanel'

// Shared pages
import Pipeline       from '@/pages/shared/Pipeline'
import Leads          from '@/pages/shared/Leads'
import Accounts       from '@/pages/shared/Accounts'
import ReconnectQueue from '@/pages/shared/ReconnectQueue'
import CalendarPage   from '@/pages/shared/Calendar'
import Settings       from '@/pages/shared/Settings'
import Import         from '@/pages/shared/Import'
import AiSetup        from '@/pages/shared/AiSetup'
import AskAi          from '@/pages/shared/AskAi'
import NotFound       from '@/pages/shared/NotFound'
import Loading        from '@/pages/shared/Loading'

/** Redirect to the right dashboard based on role */
function RoleHome() {
  const { isCEO, isCOO, isCCO, isTL, isAM, isBDMode } = useAuth()
  if ((isCEO || isCOO) && !isBDMode) return <Navigate to="/dashboard/executive" replace />
  if (isCCO || isTL)                 return <Navigate to="/dashboard/cco"       replace />
  if (isAM)                          return <Navigate to="/dashboard/am"        replace />
  return                                    <Navigate to="/dashboard/bd"        replace />
}

/** Block non-admin users */
function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <Loading />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

/** Block users without import permission */
function ImportRoute({ children }) {
  const { canImport } = useAuth()
  if (!canImport) return <Navigate to="/" replace />
  return children
}

/** Block unauthenticated access */
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return children
}

/** Block authenticated users from seeing login */
function GuestRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { toasts, dismissToast } = useApp()

  return (
    <>
      <Routes>
        {/* Guest routes */}
        <Route path="/login"          element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes - all wrapped in AppShell */}
        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<RoleHome />} />

          {/* Dashboards */}
          <Route path="dashboard/executive" element={<ExecutiveDashboard />} />
          <Route path="dashboard/cco"       element={<CCODashboard />} />
          <Route path="dashboard/bd"        element={<BDDashboard />} />
          <Route path="dashboard/am"        element={<AMDashboard />} />

          {/* Admin */}
          <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

          {/* Core pages */}
          <Route path="pipeline"  element={<Pipeline />} />
          <Route path="leads"     element={<Leads />} />
          <Route path="accounts"  element={<Accounts />} />
          <Route path="reconnect" element={<ReconnectQueue />} />
          <Route path="calendar"  element={<CalendarPage />} />
          <Route path="settings"  element={<Settings />} />
          <Route path="ask-ai"    element={<AskAi />} />
          <Route path="ai-setup"  element={<AiSetup />} />

          <Route path="import" element={
            <ImportRoute><Import /></ImportRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}