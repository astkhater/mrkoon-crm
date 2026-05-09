/**
 * Moderator — Data Entry Panel
 * Single-lead entry form for data entry operators.
 * Moderators can add and edit any lead; no pipeline or analytics access.
 */
import { useState, useCallback } from 'react'
import { useQueryClient }         from '@tanstack/react-query'
import { PlusCircle, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react'
import { supabase }   from '@/lib/supabase'
import { useAuth }    from '@/contexts/AuthContext'
import { useApp }     from '@/contexts/AppContext'
import TopBar         from '@/components/layout/TopBar'

const STAGES = [
  { value: 'new_lead',        label: 'New Lead' },
  { value: 'reaching_out',   label: 'Reaching Out' },
  { value: 'no_response',    label: 'No Response' },
  { value: 'meeting_done',   label: 'Meeting Done' },
  { value: 'negotiation',    label: 'Negotiation' },
  { value: 'prospect_active',label: 'Prospect Active' },
  { value: 'prospect_cold',  label: 'Prospect Cold' },
  { value: 'reconnect',      label: 'Reconnect' },
  { value: 'client_active',  label: 'Client Active' },
  { value: 'client_inactive',label: 'Client Inactive' },
  { value: 'client_renewal', label: 'Client Renewal' },
  { value: 'lost',           label: 'Lost' },
  { value: 'unqualified',    label: 'Unqualified' },
]

const SOURCES = [
  'linkedin', 'referral', 'cold_call', 'website', 'event', 'partner', 'other',
]

const EMPTY = {
  company_name:        '',
  entity:              'EG',
  contact_name:        '',
  contact_title:       '',
  phone:               '',
  email:               '',
  stage:               'new_lead',
  source:              '',
  estimated_gmv_month: '',
  next_action:         '',
  next_action_date:    '',
  notes:               '',
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '13px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '7px',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function ModeratorDataEntry() {
  const { userId }  = useAuth()
  const { toast }   = useApp()
  const queryClient = useQueryClient()

  const [form,     setForm]     = useState({ ...EMPTY })
  const [saving,   setSaving]   = useState(false)
  const [lastSaved, setLastSaved] = useState(null)  // company name of last added lead
  const [error,    setError]    = useState(null)
  const [count,    setCount]    = useState(0)       // leads added this session

  const set = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  function validate() {
    if (!form.company_name.trim()) return 'Company name is required.'
    if (!form.entity)               return 'Entity is required.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true)
    setError(null)

    const payload = {
      company_name:  form.company_name.trim(),
      entity:        form.entity,
      contact_name:  form.contact_name.trim()  || null,
      contact_title: form.contact_title.trim() || null,
      phone:         form.phone.trim()         || null,
      email:         form.email.trim()         || null,
      stage:         form.stage,
      source:        form.source               || null,
      estimated_gmv_month: form.estimated_gmv_month
        ? parseFloat(String(form.estimated_gmv_month).replace(/,/g, '')) || null
        : null,
      next_action:      form.next_action.trim()      || null,
      next_action_date: form.next_action_date        || null,
      notes:            form.notes.trim()            || null,
      assigned_to:      userId,
      is_sna:           false,
      date_added:       new Date().toISOString().slice(0, 10),
    }

    try {
      const { error: supaErr } = await supabase.from('leads').insert([payload])
      if (supaErr) throw supaErr

      setLastSaved(form.company_name.trim())
      setCount(c => c + 1)
      setForm({ ...EMPTY })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      // Focus back on first field
      document.getElementById('mod-company')?.focus()
    } catch (err) {
      setError(err.message ?? 'Failed to save lead.')
      toast({ type: 'error', message: err.message ?? 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title="Data Entry" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '640px' }}>

          {/* Session counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Leads added this session: <strong style={{ color: 'var(--text-primary)' }}>{count}</strong>
            </div>
            {lastSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#22c55e' }}>
                <CheckCircle2 size={13} />
                <span>Last saved: <em>{lastSaved}</em></span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="crm-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', fontSize: '13px' }}>Company</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                <Field label="Company Name" required>
                  <input
                    id="mod-company"
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    placeholder="e.g. Al Masry Steel"
                    style={inputStyle}
                    autoFocus
                  />
                </Field>
                <Field label="Entity" required>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '0px' }}>
                    {['EG', 'KSA'].map(e => (
                      <button
                        type="button"
                        key={e}
                        onClick={() => set('entity', e)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '7px',
                          border: `1px solid ${form.entity === e ? 'var(--brand-green)' : 'var(--border-default)'}`,
                          background: form.entity === e ? 'var(--brand-green)' : 'transparent',
                          color: form.entity === e ? '#fff' : 'var(--text-secondary)',
                          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            <div className="crm-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', fontSize: '13px' }}>Contact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Full Name">
                  <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                    placeholder="e.g. Ahmed Hassan" style={inputStyle} />
                </Field>
                <Field label="Title / Position">
                  <input value={form.contact_title} onChange={e => set('contact_title', e.target.value)}
                    placeholder="e.g. Procurement Manager" style={inputStyle} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+20 10 xxxx xxxx" style={inputStyle} type="tel" />
                </Field>
                <Field label="Email">
                  <input value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="email@company.com" style={inputStyle} type="email" />
                </Field>
              </div>
            </div>

            <div className="crm-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', fontSize: '13px' }}>Pipeline</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Stage">
                  <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Source">
                  <select value={form.source} onChange={e => set('source', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">— select —</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Est. GMV / Month (USD)">
                  <input value={form.estimated_gmv_month} onChange={e => set('estimated_gmv_month', e.target.value)}
                    placeholder="e.g. 5000" style={inputStyle} type="number" min="0" />
                </Field>
              </div>
            </div>

            <div className="crm-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', fontSize: '13px' }}>Next Action</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Action">
                  <input value={form.next_action} onChange={e => set('next_action', e.target.value)}
                    placeholder="e.g. Send intro email" style={inputStyle} />
                </Field>
                <Field label="Due Date">
                  <input value={form.next_action_date} onChange={e => set('next_action_date', e.target.value)}
                    style={inputStyle} type="date" />
                </Field>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Field label="Notes">
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Any additional context…"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                  />
                </Field>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
                <AlertTriangle size={15} />
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="submit"
                className="btn btn-primary btn-md"
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <PlusCircle size={15} />
                {saving ? 'Saving…' : 'Save Lead'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-md"
                onClick={() => { setForm({ ...EMPTY }); setError(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={13} />
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
