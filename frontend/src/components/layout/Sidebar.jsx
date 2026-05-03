import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, TrendingUp, Briefcase,
  Calendar, RefreshCw, Upload, Settings, Sparkles, LogOut,
  ShieldCheck, HelpCircle, Briefcase as BriefcaseIcon, X
} from 'lucide-react'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'
import { supabase }  from '@/lib/supabase'

// Nav definitions per role group
const NAV_EXEC = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard/executive' },
  { key: 'nav.pipeline',  icon: TrendingUp,      href: '/pipeline' },
  { key: 'nav.leads',     icon: Users,           href: '/leads' },
  { key: 'nav.accounts',  icon: Briefcase,       href: '/accounts' },
  { key: 'nav.reconnect', icon: RefreshCw,       href: '/reconnect' },
  { key: 'nav.calendar',  icon: Calendar,        href: '/calendar' },
  { key: 'nav.import',    icon: Upload,          href: '/import', importOnly: true },
  { key: 'nav.settings',  icon: Settings,        href: '/settings' },
]

const NAV_MANAGER = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard/cco' },
  { key: 'nav.pipeline',  icon: TrendingUp,      href: '/pipeline' },
  { key: 'nav.leads',     icon: Users,           href: '/leads' },
  { key: 'nav.accounts',  icon: Briefcase,       href: '/accounts' },
  { key: 'nav.reconnect', icon: RefreshCw,       href: '/reconnect' },
  { key: 'nav.calendar',  icon: Calendar,        href: '/calendar' },
  { key: 'nav.import',    icon: Upload,          href: '/import', importOnly: true },
  { key: 'nav.settings',  icon: Settings,        href: '/settings' },
]

const NAV_BD = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard/bd' },
  { key: 'nav.pipeline',  icon: TrendingUp,      href: '/pipeline' },
  { key: 'nav.leads',     icon: Users,           href: '/leads' },
  { key: 'nav.reconnect', icon: RefreshCw,       href: '/reconnect' },
  { key: 'nav.calendar',  icon: Calendar,        href: '/calendar' },
  { key: 'nav.settings',  icon: Settings,        href: '/settings' },
]

const NAV_AM = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard/am' },
  { key: 'nav.accounts',  icon: Briefcase,       href: '/accounts' },
  { key: 'nav.reconnect', icon: RefreshCw,       href: '/reconnect' },
  { key: 'nav.calendar',  icon: Calendar,        href: '/calendar' },
  { key: 'nav.leads',     icon: Users,           href: '/leads' },
  { key: 'nav.settings',  icon: Settings,        href: '/settings' },
]

export default function Sidebar({ onShowTour }) {
  const {
    role, isAdmin, isExecutive, isCCO, isCEO, isCOO, isTL, isBDRep, isAM,
    canImport, isBDMode, viewMode, entityView, setViewMode, setEntityView,
    signOut, profile,
  } = useAuth()
  const { t, lang, setLang, theme, setTheme, repFilter, repFilterName, setRepFilter } = useApp()

  // Reps list for the rep selector (managers + executives only)
  const isManager = isCCO || isTL || isCEO || isCOO
  const [repsList, setRepsList] = useState([])
  useEffect(() => {
    if (!isManager && !isExecutive) return
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['bd_rep', 'bd_tl', 'am'])
      .order('full_name')
      .then(({ data }) => setRepsList(data ?? []))
  }, [isManager, isExecutive])

  // Pick nav list
  let navItems
  if (isBDMode) {
    navItems = NAV_BD
  } else if (isCEO || isCOO) {
    navItems = NAV_EXEC
  } else if (isCCO || isTL) {
    navItems = NAV_MANAGER
  } else if (isAM) {
    navItems = NAV_AM
  } else {
    navItems = NAV_BD
  }

  const roleLabel = isBDMode
    ? 'BD MODE'
    : (role?.toUpperCase().replace(/_/g, ' ') ?? '')

  const showRepSelector = (isManager || isExecutive) && !isBDMode

  return (
    <aside className="sidebar">
      {/* Logo + user */}
      <div className="px-4 py-4 border-b b1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-brand-green flex items-center justify-center">
            <span className="text-xs font-bold text-white">M</span>
          </div>
          <span className="text-sm font-bold t1">Mrkoon CRM</span>
        </div>
        <div className="mt-2 text-xs t3 truncate">{profile?.full_name}</div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="badge" style={{
            background: isBDMode ? 'rgba(59,130,246,0.15)' : 'rgba(34,211,238,0.1)',
            color: isBDMode ? '#60a5fa' : 'var(--brand-cyan)',
            fontSize: '10px'
          }}>
            {roleLabel}
          </span>
          {isAdmin && (
            <span className="badge" style={{
              background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontSize: '10px'
            }}>ADMIN</span>
          )}
        </div>
      </div>

      {/* Executive entity toggle */}
      {isExecutive && !isBDMode && (
        <div className="px-3 pt-3 pb-1 border-b b1">
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>View</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['EG','KSA','holding'].map(e => (
              <button
                key={e}
                onClick={() => setEntityView(e)}
                style={{
                  flex: 1, padding: '4px 0', fontSize: '11px', fontWeight: 600,
                  borderRadius: '6px', border: '1px solid',
                  cursor: 'pointer',
                  background: entityView === e ? 'var(--brand-green)' : 'transparent',
                  color: entityView === e ? '#fff' : 'var(--text-secondary)',
                  borderColor: entityView === e ? 'var(--brand-green)' : 'var(--border)',
                }}
              >
                {e === 'holding' ? 'All' : e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BD Working mode toggle for executives */}
      {isExecutive && (
        <div className="px-3 py-2 border-b b1">
          <button
            onClick={() => setViewMode(isBDMode ? 'dashboard' : 'bd-working')}
            style={{
              width: '100%', padding: '6px 10px', fontSize: '12px', fontWeight: 600,
              borderRadius: '6px', border: '1px solid', cursor: 'pointer',
              background: isBDMode ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: isBDMode ? '#60a5fa' : 'var(--text-secondary)',
              borderColor: isBDMode ? 'rgba(59,130,246,0.4)' : 'var(--border)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <BriefcaseIcon size={13} />
            {isBDMode ? 'Exit BD Mode' : 'Work as BD'}
          </button>
        </div>
      )}

      {/* Rep filter selector */}
      {showRepSelector && repsList.length > 0 && (
        <div className="px-3 py-2 border-b b1">
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Rep View
          </div>
          {repFilter ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', borderRadius: '6px',
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.25)',
            }}>
              <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: 'var(--brand-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {repFilterName}
              </span>
              <button
                onClick={() => setRepFilter('', '')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', color: 'var(--text-muted)' }}
                title="Clear rep filter"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <select
              className="crm-input"
              style={{ width: '100%', fontSize: '11px', padding: '4px 8px' }}
              value=""
              onChange={e => {
                const rep = repsList.find(r => r.id === e.target.value)
                if (rep) setRepFilter(rep.id, rep.full_name)
              }}
            >
              <option value="">All reps</option>
              {repsList.map(r => (
                <option key={r.id} value={r.id}>{r.full_name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2">
        {navItems
          .filter(item => !(item.importOnly && !canImport))
          .map(item => (
            <NavLink
              key={item.key}
              to={item.href}
              end={item.href.endsWith('/dashboard/cco') || item.href.endsWith('/dashboard/bd') || item.href.endsWith('/dashboard/am') || item.href.endsWith('/dashboard/executive')}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <item.icon size={15} />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}

        {/* Admin link */}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <ShieldCheck size={15} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      {/* Ask AI */}
      <div className="px-3 py-2 border-t b1">
        <NavLink to="/ask-ai" className="btn btn-ai btn-md w-full">
          <Sparkles size={14} />
          {t('nav.ai')}
        </NavLink>
      </div>

      {/* Help / tour trigger */}
      <div className="px-3 py-2 border-t b1">
        <button
          onClick={onShowTour}
          className="btn btn-ghost btn-sm w-full"
          style={{ justifyContent: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}
        >
          <HelpCircle size={13} /> Quick Tour
        </button>
      </div>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t b1 flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="btn btn-ghost btn-xs flex-1"
          title="Toggle language"
        >
          {lang === 'en' ? 'عربي' : 'EN'}
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'auto' : 'dark')}
          className="btn btn-ghost btn-xs"
          title={'Theme: ' + theme}
        >
          {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto'}
        </button>
        <button
          onClick={signOut}
          className="btn btn-ghost btn-icon"
          title={t('auth.signout')}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
