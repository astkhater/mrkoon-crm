import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useApp }  from '@/contexts/AppContext'

// Layout
import AppShell        from '@/components/layout/AppShell'
import ToastContainer  from '@/components/ui/ToastContainer'
import ErrorBoundary   from '@/components/ui/ErrorBoundary'
import BugReportButton from '@/components/ui/BugReportButton'

// Auth screens
import Login         from '@/pages/auth/Login'
import ResetPassword from '@/pages/auth/ResetPassword'

// Role dashboards
import CCODashboard       from '@/pages/cco/Dashboard'
import BDDashboard        from '@/pages/bd/Dashboard'
import AMDashboard        from '@/pages/am/Dashboard'
import ExecutiveDashboard from '@/pages/executive/Dashboard'
import AdminPanel         from '@/pages/admin/AdminPanel'
import ModeratorDataEntry from '@/pages/moderator/DataEntry'

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
import MergePage      from '@/pages/shared/MergePage'
import NotFound       from '@/pages/shared/NotFound'
import Loading        from '@/pages/shared/Loading'

/** Redirect to the right dashboard based on role */
function RoleHome() {
  const { isCEO, isCOO, isCCO, isTL, isAM, isKSAClevel, isModerator, isBDMode } = useAuth()
  if ((isCEO || isCOO || isKSAClevel) && !isBDMode) return <Navigate to="/dashboard/executive" replace />
  if (isCCO || isTL)                                return <Navigate to="/dashboard/cco"       replace />
  if (isAM)                                         return <Navigate to="/dashboard/am"        replace />
  if (isModerator)                                  return <Navigate to="/data-entry"           replace />
  return                                                   <Navigate to="/dashboard/bd"        replace />
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <Loading />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function ImportRoute({ children }) {
  const { canImport } = useAuth()
  if (!canImport) return <Navigate to="/" replace />
  return children
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { toasts, dismissToast, session } = useApp()
  const { session: authSession } = useAuth()

  return (
    <ErrorBoundary>
      <Routes>
        {/* Guest routes */}
        <Route path="/login"          element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<RoleHome />} />

          <Route path="dashboard/executive" element={<ErrorBoundary><ExecutiveDashboard /></ErrorBoundary>} />
          <Route path="dashboard/cco"       element={<ErrorBoundary><CCODashboard /></ErrorBoundary>} />
          <Route path="dashboard/bd"        element={<ErrorBoundary><BDDashboard /></ErrorBoundary>} />
          <Route path="dashboard/am"        element={<ErrorBoundary><AMDashboard /></ErrorBoundary>} />

          <Route path="admin"      element={<AdminRoute><ErrorBoundary><AdminPanel /></ErrorBoundary></AdminRoute>} />
          <Route path="data-entry" element={<ErrorBoundary><ModeratorDataEntry /></ErrorBoundary>} />

          <Route path="pipeline"  element={<ErrorBoundary><Pipeline /></ErrorBoundary>} />
          <Route path="leads"     element={<ErrorBoundary><Leads /></ErrorBoundary>} />
          <Route path="accounts"  element={<ErrorBoundary><Accounts /></ErrorBoundary>} />
          <Route path="reconnect" element={<ErrorBoundary><ReconnectQueue /></ErrorBoundary>} />
          <Route path="calendar"  element={<ErrorBoundary><CalendarPage /></ErrorBoundary>} />
          <Route path="settings"  element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="ask-ai"    element={<ErrorBoundary><AskAi /></ErrorBoundary>} />
          <Route path="ai-setup"  element={<ErrorBoundary><AiSetup /></ErrorBoundary>} />
          <Route path="merge"     element={<ErrorBoundary><MergePage /></ErrorBoundary>} />
          <Route path="import"    element={<ImportRoute><ErrorBoundary><Import /></ErrorBoundary></ImportRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Floating bug report button — only shown when logged in */}
      {authSession && <BugReportButton />}
    </ErrorBoundary>
  )
}
