import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useApp }  from '@/contexts/AppContext'

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const { t, lang, setLang }      = useApp()
  const navigate                  = useNavigate()
  const [email, setEmail]         = useState('')
  const [pass,  setPass]          = useState('')
  const [busy,  setBusy]          = useState(false)
  const [err,   setErr]           = useState('')
  const [mode,  setMode]          = useState('login')
  const [resetEmail, setResetEmail] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await signIn(email, pass)
      navigate('/', { replace: true })
    } catch (e) {
      setErr(e.message || 'Invalid credentials')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await resetPassword(resetEmail)
      setMode('sent')
    } catch (e) {
      setErr(e.message || 'Failed to send reset email')
    } finally {
      setBusy(false)
    }
  }

  const logoBlock = (
    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: 'var(--brand-green)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>M</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Mrkoon CRM</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        Business Development Platform
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {logoBlock}
        <div className="crm-card" style={{ padding: '28px' }}>
          {mode === 'login' && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="crm-label">{t('auth.email')}</label>
                <input type="email" className="crm-input" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@mrkoon.com"
                  required autoFocus />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label className="crm-label">{t('auth.password')}</label>
                <input type="password" className="crm-input" value={pass}
                  onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
              </div>
              <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <button type="button"
                  onClick={() => { setResetEmail(email); setErr(''); setMode('forgot') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: 'var(--brand-green)', padding: 0, textDecoration: 'underline' }}>
                  Forgot password?
                </button>
              </div>
              {err && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', fontSize: '13px' }}>{err}</div>
              )}
              <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full" style={{ width: '100%' }}>
                {busy ? t('auth.signing_in') : t('auth.signin')}
              </button>
            </form>
          )}
          {mode === 'forgot' && (
            <form onSubmit={handleReset}>
              <div style={{ marginBottom: '6px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Reset password</div>
              <div style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Enter your email and we will send you a reset link.
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="crm-label">{t('auth.email')}</label>
                <input type="email" className="crm-input" value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)} placeholder="you@mrkoon.com" required autoFocus />
              </div>
              {err && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', fontSize: '13px' }}>{err}</div>
              )}
              <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full"
                style={{ width: '100%', marginBottom: '12px' }}>
                {busy ? 'Sending...' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => { setErr(''); setMode('login') }}
                className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                Back to sign in
              </button>
            </form>
          )}
          {mode === 'sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Check your email
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                A password reset link was sent to <strong>{resetEmail}</strong>
              </div>
              <button type="button" onClick={() => { setErr(''); setMode('login') }}
                className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                Back to sign in
              </button>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="btn btn-ghost btn-sm">
            {lang === 'en' ? 'عربي' : 'English'}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Mrkoon BD CRM v1  •  Egypt
        </div>
      </div>
    </div>
  )
}