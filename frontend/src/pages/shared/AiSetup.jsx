import { useState }  from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, Building2, Key, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'
import TopBar        from '@/components/layout/TopBar'

export default function AiSetup() {
  const { userId }    = useAuth()
  const { t, toast }  = useApp()
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo      = searchParams.get('from') ?? '/ask-ai'
  const [selected,    setSelected]   = useState(null)
  const [apiKey,      setApiKey]     = useState('')
  const [showKey,     setShowKey]    = useState(false)
  const [saving,      setSaving]     = useState(false)
  const [done,        setDone]       = useState(false)

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      if (selected === 'company') {
        const { error } = await supabase
          .from('user_settings')
          .upsert({ user_id: userId, use_company_ai: true }, { onConflict: 'user_id' })
        if (error) throw error
      } else {
        if (!apiKey.trim().startsWith('sk-ant-')) {
          throw new Error('Key must start with sk-ant-  — check it and try again')
        }
        const { error } = await supabase.functions.invoke('save-ai-key', { body: { api_key: apiKey.trim() } })
        if (error) throw error
        await supabase.from('user_settings').upsert({ user_id: userId, use_company_ai: false }, { onConflict: 'user_id' })
      }
      setDone(true)
      toast('AI configured — ready to use', 'success')
      setTimeout(() => navigate(returnTo), 1200)
    } catch (err) {
      toast(err.message ?? 'Failed to save AI key', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title="AI Setup" actions={
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ArrowLeft size={13} /> Back
        </button>
      } />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px', maxWidth: '480px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Set up your AI Assistant</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            The AI assistant helps you draft messages, summarize your pipeline, and get answers about your leads.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '560px', marginBottom: '28px' }}>
          <OptionCard selected={selected === 'company'} onSelect={() => setSelected('company')}
            icon={Building2} iconColor="#22c55e" title="Company AI"
            description="Use Mrkoon's shared AI account — zero setup, works immediately."
            badge="Recommended" badgeColor="#22c55e" />
          <OptionCard selected={selected === 'personal'} onSelect={() => setSelected('personal')}
            icon={Key} iconColor="#f59e0b" title="My Own Key"
            description="Use your personal Anthropic API key — your own usage, your own billing." />
        </div>
        {selected === 'personal' && (
          <div style={{ width: '100%', maxWidth: '560px', marginBottom: '24px' }}>
            <label className="crm-label">
              Anthropic API Key
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--brand-cyan)', textDecoration: 'none' }}>
                Get one →
              </a>
            </label>
            <div style={{ position: 'relative' }}>
              <input className="crm-input" type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-api03-..." value={apiKey} onChange={e => setApiKey(e.target.value)}
                style={{ paddingRight: '40px', fontFamily: 'monospace', fontSize: '13px' }} autoFocus />
              <button type="button" onClick={() => setShowKey(s => !s)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Your key is encrypted and stored securely.
            </p>
          </div>
        )}
        {selected && (
          <div style={{ width: '100%', maxWidth: '560px' }}>
            <button className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', background: done ? '#22c55e' : undefined,
                display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={handleSave}
              disabled={saving || done || (selected === 'personal' && !apiKey.trim())}>
              {done ? <><CheckCircle2 size={16} /> Done — redirecting…</>
               : saving ? 'Saving…'
               : selected === 'company' ? <><Sparkles size={15} /> Use Company AI</>
               : <><Key size={15} /> Save My API Key</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function OptionCard({ selected, onSelect, icon: Icon, iconColor, title, description, badge, badgeColor }) {
  return (
    <div onClick={onSelect} style={{
      flex: 1, padding: '20px', borderRadius: '12px', cursor: 'pointer',
      background: selected ? `${iconColor}0d` : 'var(--bg-card)',
      border: selected ? `2px solid ${iconColor}` : '2px solid var(--border-default)',
      transition: 'border-color 0.15s, background 0.15s',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-default)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${iconColor}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={iconColor} />
        </div>
        {badge && (
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
            background: `${badgeColor}20`, color: badgeColor }}>{badge}</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>
  )
}