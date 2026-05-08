import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Building2, User, Check } from 'lucide-react'
import { useApp }  from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function AISetup() {
  const { t, toast } = useApp()
  const { userId }   = useAuth()
  const navigate     = useNavigate()
  const [mode, setMode]     = useState('company')   // 'company' | 'personal'
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy]     = useState(false)

  async function handleSave() {
    setBusy(true)
    try {
      const updates = { ai_mode: mode }
      // Note: API key encryption happens server-side via Edge Function.
      // Here we just flag the mode; the key is sent to a secure endpoint.
      if (mode === 'personal' && apiKey) {
        // POST to Edge Function for encrypted storage
        const { error } = await supabase.functions.invoke('save-ai-key', {
          body: { api_key: apiKey, provider: 'anthropic' }
        })
        if (error) throw error
      }
      await supabase.from('user_settings').upsert({ user_id: userId, ...updates })
      toast('AI setup saved', 'success')
      navigate('/', { replace: true })
    } catch (e) {
      toast(e.message || 'Failed to save AI settings', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-content" style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '40px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '12px',
        }}>
          <Sparkles size={20} color="#fff" />
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {t('auth.ai_setup')}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
          Choose how you want to use the AI assistant
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {/* Company AI */}
        <button
          onClick={() => setMode('company')}
          style={{
            textAlign: 'start', padding: '16px', borderRadius: '8px', cursor: 'pointer',
            background: mode === 'company' ? 'rgba(34,197,94,0.08)' : 'var(--bg-card)',
            border: `1px solid ${mode === 'company' ? 'rgba(34,197,94,0.3)' : 'var(--border-default)'}`,
            transition: 'all 150ms',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={18} color={mode === 'company' ? 'var(--brand-green)' : 'var(--text-secondary)'} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                {t('auth.company_ai')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Shared key managed by Mrkoon — no setup needed
              </div>
            </div>
            {mode === 'company' && (
              <Check size={16} color="var(--brand-green)" style={{ marginInlineStart: 'auto' }} />
            )}
          </div>
        </button>

        {/* Personal AI */}
        <button
          onClick={() => setMode('personal')}
          style={{
            textAlign: 'start', padding: '16px', borderRadius: '8px', cursor: 'pointer',
            background: mode === 'personal' ? 'rgba(168,85,247,0.08)' : 'var(--bg-card)',
            border: `1px solid ${mode === 'personal' ? 'rgba(168,85,247,0.3)' : 'var(--border-default)'}`,
            transition: 'all 150ms',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={18} color={mode === 'personal' ? '#a855f7' : 'var(--text-secondary)'} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                {t('auth.personal_ai')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Enter your own Anthropic API key — stored encrypted
              </div>
            </div>
            {mode === 'personal' && (
              <Check size={16} color="#a855f7" style={{ marginInlineStart: 'auto' }} />
            )}
          </div>
        </button>
      </div>

      {/* API key input (personal only) */}
      {mode === 'personal' && (
        <div style={{ marginBottom: '20px' }}>
          <label className="crm-label">{t('auth.api_key')} — Anthropic</label>
          <input
            type="password"
            className="crm-input"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Key is encrypted (AES-256) and never shared. Get yours at console.anthropic.com
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="btn btn-secondary btn-md"
          style={{ flex: 1 }}
        >
          Skip for now
        </button>
        <button
          onClick={handleSave}
          disabled={busy || (mode === 'personal' && !apiKey)}
          className="btn btn-primary btn-md"
          style={{ flex: 2 }}
        >
          {busy ? 'Saving...' : t('auth.connect')}
        </button>
      </div>
    </div>
  )
}
