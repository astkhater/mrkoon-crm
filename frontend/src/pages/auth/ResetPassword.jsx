import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/contexts/AppContext'

export default function ResetPassword() {
  const { t } = useApp()
  const navigate = useNavigate()
  const [pass, setPass]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const [ready, setReady]     = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (pass !== confirm) { setErr('Passwords do not match'); return }
    if (pass.length < 6)  { setErr('Password must be at least 6 characters'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) throw error
      await supabase.auth.signOut()
      navigate('/login?reset=done', { replace: true })
    } catch (e) {
      setErr(e.message || 'Failed to update password')
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
        Set new password
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
          {!ready ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Validating reset link…
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '6px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Choose a new password
              </div>
              <div style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Must be at least 6 characters.
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="crm-label">New password</label>
                <input type="password" className="crm-input" value={pass}
                  onChange={e => setPass(e.target.value)} placeholder="••••••••" required autoFocus />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="crm-label">Confirm password</label>
                <input type="password" className="crm-input" value={confirm}
                  onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
              </div>
              {err && (
                <div style={{
                  padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', fontSize: '13px',
                }}>{err}</div>
              )}
              <button type="submit" disabled={busy} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                {busy ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Mrkoon BD CRM v1  •  Egypt
        </div>
      </div>
    </div>
  )
}