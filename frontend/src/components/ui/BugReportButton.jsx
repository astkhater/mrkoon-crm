/**
 * BugReportButton — floating button for users to report issues.
 * Captures page URL, user identity, and a description.
 * Saves to support_tickets table in Supabase.
 */
import { useState } from 'react'
import { MessageSquare, X, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/contexts/AuthContext'

export default function BugReportButton() {
  const { profile } = useAuth()
  const [open,        setOpen]        = useState(false)
  const [description, setDescription] = useState('')
  const [sending,     setSending]     = useState(false)
  const [sent,        setSent]        = useState(false)

  async function submit() {
    if (!description.trim()) return
    setSending(true)
    await supabase.from('support_tickets').insert({
      reporter_id:   profile?.id   ?? null,
      reporter_name: profile?.full_name ?? profile?.email ?? 'Unknown',
      reporter_role: profile?.role  ?? null,
      page_url:      window.location.href,
      description:   description.trim(),
      status:        'open',
    })
    setSent(true)
    setSending(false)
    setTimeout(() => { setOpen(false); setSent(false); setDescription('') }, 2500)
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', bottom: '52px', right: 0,
          width: '300px', borderRadius: '12px',
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '16px',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle2 size={28} style={{ color: '#22c55e', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Reported — thank you
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                This will be reviewed and fixed.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Report an issue
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {window.location.pathname}
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what went wrong or what you expected to happen…"
                autoFocus
                rows={4}
                style={{
                  width: '100%', resize: 'none', fontSize: '12px', lineHeight: 1.5,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: '6px', padding: '8px', color: 'var(--text-primary)',
                  boxSizing: 'border-box', marginBottom: '10px', outline: 'none',
                }}
              />
              <button
                onClick={submit}
                disabled={!description.trim() || sending}
                style={{
                  width: '100%', padding: '8px', borderRadius: '7px', border: 'none',
                  background: description.trim() ? 'var(--brand-green)' : 'var(--bg-elevated)',
                  color: description.trim() ? '#fff' : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 700, cursor: description.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Send size={12} />
                {sending ? 'Sending…' : 'Send report'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Report an issue"
        style={{
          width: '42px', height: '42px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open ? 'var(--bg-elevated)' : 'rgba(34,197,94,0.15)',
          color: open ? 'var(--text-muted)' : 'var(--brand-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', transition: 'all 0.15s',
        }}
      >
        {open ? <X size={16} /> : <MessageSquare size={16} />}
      </button>
    </div>
  )
}
