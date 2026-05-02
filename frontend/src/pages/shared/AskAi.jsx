import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate }   from 'react-router-dom'
import { Sparkles, Send, User, RotateCcw, Settings2, ChevronRight } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'
import TopBar        from '@/components/layout/TopBar'

const SUGGESTIONS = {
  bd_rep: [
    'Who are my overdue leads?',
    'Summarize my pipeline by stage',
    'Draft a follow-up WhatsApp for a cold lead',
    'What should I focus on today?',
  ],
  am: [
    'Which clients are at renewal risk?',
    'Draft a monthly check-in message',
    'Show my portfolio health',
    'Which clients have missed GMV targets?',
  ],
  bd_tl: [
    "Summarize the team's pipeline",
    'Who has the most overdue actions?',
    'Where are we vs the 300-client target?',
    'Which rep needs coaching this week?',
  ],
  cco: [
    'Give me a full pipeline overview',
    'How many overdue actions across the team?',
    'Which stage has the highest drop-off?',
    'Where are we vs the 300-client target?',
  ],
}

const DEFAULT_CHIPS = [
  'Summarize my pipeline',
  'What should I focus on today?',
  'Draft a follow-up message',
  'Show overdue actions',
]

export default function AskAi() {
  const { userId, role }  = useAuth()
  const { t, toast }      = useApp()
  const navigate          = useNavigate()
  const bottomRef         = useRef(null)
  const inputRef          = useRef(null)
  const chips = SUGGESTIONS[role] ?? DEFAULT_CHIPS

  const [messages,    setMessages]   = useState([])
  const [input,       setInput]      = useState('')
  const [loading,     setLoading]    = useState(false)
  const [noKey,       setNoKey]      = useState(false)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  const sendMessage = useCallback(async (text) => {
    const userText = (text ?? input).trim()
    if (!userText || loading) return
    setInput(''); setLoading(true); setNoKey(false)
    const userMsg = { role: 'user', content: userText }
    setMessages(prev => [...prev, userMsg])
    const placeholder = { role: 'assistant', content: '', streaming: true }
    setMessages(prev => [...prev, placeholder])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            message: userText,
            history: messages.filter(m => !m.streaming).map(m => ({ role: m.role, content: m.content })),
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        if (res.status === 400 && err.error?.includes('ai-setup')) {
          setNoKey(true)
          setMessages(prev => prev.slice(0, -1))
          return
        }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let full   = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const { text } = JSON.parse(raw)
            full += text
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { role: 'assistant', content: full, streaming: true }
              return copy
            })
          } catch { /* skip */ }
        }
      }
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: full, streaming: false }
        return copy
      })
    } catch (err) {
      toast(err.message ?? 'AI request failed', 'error')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, loading, messages])

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); sendMessage() }
  }

  function clearChat() { setMessages([]); setNoKey(false); setInput(''); inputRef.current?.focus() }

  const actions = (
    <div style={{ display: 'flex', gap: '8px' }}>
      {messages.length > 0 && (
        <button className="btn btn-ghost btn-sm" onClick={clearChat} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <RotateCcw size={13} /> New chat
        </button>
      )}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ai-setup')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Settings2 size={13} /> AI Setup
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title="Ask AI" actions={actions} />
      {noKey && (
        <div style={{ margin: '20px 24px 0', padding: '16px 20px', background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.3)', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>AI not configured</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Set up your AI key to start using the assistant</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/ai-setup?from=/ask-ai')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            Configure <ChevronRight size={13} />
          </button>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 && !noKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Mrkoon AI Assistant</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px', textAlign: 'center', maxWidth: '380px' }}>
              Ask me about your pipeline, draft messages, or get a quick summary.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '480px' }}>
              {chips.map(chip => (
                <button key={chip} onClick={() => sendMessage(chip)} disabled={loading}
                  style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                    background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-cyan)'; e.currentTarget.style.color = 'var(--brand-cyan)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'linear-gradient(135deg, #0ea5e9, #22d3ee)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {msg.role === 'user' ? <User size={14} color="#fff" /> : <Sparkles size={14} color="#fff" />}
            </div>
            <div style={{ maxWidth: '72%', padding: '11px 15px', borderRadius: '12px',
              borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
              borderBottomLeftRadius:  msg.role === 'user' ? '12px' : '4px',
              background: msg.role === 'user' ? 'var(--brand-cyan)' : 'var(--bg-card)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-default)',
              fontSize: '13px', lineHeight: '1.65',
              color: msg.role === 'user' ? '#0a1628' : 'var(--text-primary)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.content || (msg.streaming ? <StreamingDots /> : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        {messages.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {chips.slice(0, 3).map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)} disabled={loading}
                style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)', cursor: 'pointer' }}>
                {chip}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea ref={inputRef} className="crm-input" rows={1}
            placeholder="Ask about your pipeline, leads, or draft a message… (Ctrl+Enter to send)"
            value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            onKeyDown={handleKeyDown} disabled={loading}
            style={{ flex: 1, resize: 'none', minHeight: '40px', maxHeight: '120px', overflow: 'auto', lineHeight: '1.5' }} />
          <button className="btn btn-primary btn-icon" onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{ width: '40px', height: '40px', flexShrink: 0, background: loading ? 'var(--bg-hover)' : undefined }}>
            <Send size={16} />
          </button>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
          Ctrl+Enter to send · Responses use live CRM data
        </div>
      </div>
    </div>
  )
}

function StreamingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center', height: '16px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%',
          background: 'var(--text-muted)',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }`}</style>
    </span>
  )
}