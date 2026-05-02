import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Phone, Sparkles, Moon, Sun, Monitor, Globe, Calendar, CheckCircle2, AlertCircle, RefreshCw, Link2Off, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/contexts/AuthContext'
import { useApp }   from '@/contexts/AppContext'
import TopBar       from '@/components/layout/TopBar'

function buildGoogleOAuthUrl(accessToken) {
  const clientId    = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth`
  const scope = ['https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/calendar.events'].join(' ')
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
    scope, access_type: 'offline', prompt: 'consent', state: accessToken,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function fetchIntegration(userId) {
  const { data } = await supabase.from('calendar_integrations')
    .select('id, is_active, google_calendar_id, last_synced_at, updated_at')
    .eq('user_id', userId).eq('provider', 'google').maybeSingle()
  return data ?? null
}

export default function Settings() {
  const { userId, profile } = useAuth()
  const { t, toast, theme, setTheme, lang, setLang } = useApp()
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()
  const queryClient     = useQueryClient()
  const [fullName,      setFullName]      = useState('')
  const [phone,         setPhone]         = useState('')
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [newPassword,   setNewPassword]   = useState('')
  const [confirmPw,     setConfirmPw]     = useState('')
  const [pwSaving,      setPwSaving]      = useState(false)
  const [pwError,       setPwError]       = useState('')

  const { data: integration, isLoading: intLoading } = useQuery({
    queryKey: ['google-integration', userId],
    queryFn:  () => fetchIntegration(userId),
    staleTime: 30000,
  })
  const googleConnected = integration?.is_active === true

  useEffect(() => {
    const gc = searchParams.get('gc')
    if (gc === 'ok') {
      toast('Google Calendar connected!', 'success')
      queryClient.invalidateQueries({ queryKey: ['google-integration'] })
      navigate('/settings', { replace: true })
    } else if (gc === 'error') {
      toast(`Google Calendar connection failed (${searchParams.get('reason') ?? 'unknown'})`, 'error')
      navigate('/settings', { replace: true })
    }
  }, [searchParams])

  useEffect(() => {
    if (profile) { setFullName(profile.full_name ?? ''); setPhone(profile.phone ?? '') }
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq('id', userId)
      if (error) throw error
      toast('Profile saved', 'success')
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (err) { toast(err.message ?? 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPw) { setPwError('Passwords do not match'); return }
    setPwSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast('Password updated successfully', 'success')
      setNewPassword(''); setConfirmPw('')
    } catch (err) { setPwError(err.message ?? 'Failed to update password') }
    finally { setPwSaving(false) }
  }

  async function handleGoogleConnect() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { toast('Not authenticated', 'error'); return }
    window.location.href = buildGoogleOAuthUrl(session.access_token)
  }

  async function handleGoogleDisconnect() {
    if (!window.confirm('Disconnect Google Calendar?')) return
    setDisconnecting(true)
    try {
      const { error } = await supabase.rpc('disconnect_google_calendar', { p_user_id: userId })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['google-integration'] })
      toast('Google Calendar disconnected', 'success')
    } catch (err) { toast(err.message ?? 'Failed to disconnect', 'error') }
    finally { setDisconnecting(false) }
  }

  function formatSyncTime(ts) {
    if (!ts) return 'Never'
    return new Date(ts).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const THEME_OPTIONS = [
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'auto', label: 'System', icon: Monitor },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title={t('nav.settings')} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '560px' }}>
        <Section title="Profile">
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="crm-label">Full name *</label>
              <div style={{ position: 'relative' }}>
                <User size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="crm-input" style={{ paddingLeft: '30px' }} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required />
              </div>
            </div>
            <div>
              <label className="crm-label">Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="crm-input" style={{ paddingLeft: '30px' }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+20 10x xxxx xxxx" type="tel" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="submit" className="btn btn-primary btn-md" disabled={saving}>{saving ? 'Saving...' : saved ? 'Saved' : t('action.save')}</button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: '20px' }}>{profile?.role?.toUpperCase().replace('_',' ')}</span>
            </div>
          </form>
        </Section>

        <Section title="Google Calendar" id="google">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-default)' }}>
              {intLoading ? <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />
               : googleConnected ? <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
               : <AlertCircle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{googleConnected ? 'Connected' : 'Not connected'}</div>
                {googleConnected && integration?.google_calendar_id && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{integration.google_calendar_id}</div>}
                {!googleConnected && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Connect to sync CRM events with your Google Calendar</div>}
              </div>
              {googleConnected
                ? <button className="btn btn-danger btn-sm" onClick={handleGoogleDisconnect} disabled={disconnecting} style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}><Link2Off size={13} />{disconnecting ? 'Disconnecting...' : 'Disconnect'}</button>
                : <button className="btn btn-primary btn-sm" onClick={handleGoogleConnect} style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}><Calendar size={13} />Connect</button>}
            </div>
            {googleConnected && (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <DetailRow label="Last synced">{formatSyncTime(integration?.last_synced_at)}</DetailRow>
                <DetailRow label="Sync frequency">Every 15 minutes (automatic)</DetailRow>
                <DetailRow label="Sync direction">CRM to Google Calendar + Google Calendar to CRM</DetailRow>
              </div>
            )}
          </div>
        </Section>

        <Section title="Theme">
          <div style={{ display: 'flex', gap: '8px' }}>
            {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTheme(key)} className={`btn btn-md ${theme === key ? 'btn-primary' : 'btn-ghost'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Language">
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ key: 'en', label: 'English' }, { key: 'ar', label: 'Arabic' }].map(({ key, label }) => (
              <button key={key} onClick={() => setLang(key)} className={`btn btn-md ${lang === key ? 'btn-primary' : 'btn-ghost'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
                <Globe size={13} />{label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="AI Assistant">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>AI Key Setup</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configure your Anthropic API key or use the company key</div>
            </div>
            <button className="btn btn-ai btn-md" onClick={() => navigate('/ai-setup')} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <Sparkles size={13} />Configure
            </button>
          </div>
        </Section>

        <Section title="Change Password">
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="crm-label">New password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="crm-input" style={{ paddingLeft: '30px' }} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
              </div>
            </div>
            <div>
              <label className="crm-label">Confirm new password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="crm-input" style={{ paddingLeft: '30px' }} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
              </div>
            </div>
            {pwError && <div style={{ fontSize: '12px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: '6px' }}>{pwError}</div>}
            <button type="submit" className="btn btn-primary btn-md" disabled={pwSaving || !newPassword}>{pwSaving ? 'Updating...' : 'Update password'}</button>
          </form>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children, id }) {
  return (
    <div id={id} style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border-default)' }}>{title}</div>
      {children}
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: '100px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{children}</span>
    </div>
  )
}