import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'

const SOURCES = [
  'campaign', 'referral', 'cold_outreach', 'whatsapp',
  'platform_app', 'exhibition', 'linkedin', 'facebook_instagram', 'unknown',
]

const INITIAL = {
  company_name: '', entity: 'EG', lead_source: 'cold_outreach',
  contact_name: '', contact_title: '', phone: '',
  estimated_gmv_month: '', deal_success_rate: '',
  next_action: '', next_action_date: '',
}

export default function AddLeadModal({ onClose, onCreated }) {
  const { userId }    = useAuth()
  const { t, toast }  = useApp()
  const qc            = useQueryClient()
  const [form, setForm]     = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.company_name.trim()) return
    setSaving(true)
    try {
      const { data: company, error: compErr } = await supabase
        .from('companies')
        .upsert(
          { name: form.company_name.trim(), entity: form.entity },
          { onConflict: 'name,entity', ignoreDuplicates: false }
        )
        .select('id').single()
      if (compErr) throw compErr

      const payload = {
        company_id: company.id, company_name: form.company_name.trim(),
        entity: form.entity, lead_source: form.lead_source,
        contact_name:  form.contact_name.trim()  || null,
        contact_title: form.contact_title.trim() || null,
        phone:         form.phone.trim()         || null,
        estimated_gmv_month: form.estimated_gmv_month  ? Number(form.estimated_gmv_month)  : null,
        deal_success_rate:   form.deal_success_rate    ? Number(form.deal_success_rate)    : null,
        next_action:      form.next_action.trim()  || null,
        next_action_date: form.next_action_date   || null,
        assigned_to: userId, stage: 'new_lead',
      }

      const { data: lead, error: leadErr } = await supabase
        .from('leads').insert(payload).select().single()
      if (leadErr) throw leadErr

      qc.invalidateQueries({ queryKey: ['pipeline-leads'] })
      qc.invalidateQueries({ queryKey: ['cco-stats'] })
      toast('Lead added', 'success')
      onCreated?.(lead)
      onClose()
    } catch (err) {
      toast(err.message ?? 'Failed to add lead', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: '520px', background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)', borderRadius: '12px',
        zIndex: 201, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px', borderBottom: '1px solid var(--border-default)',
          position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1,
        }}>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
            {t('bd.add_lead')}
          </span>
          <button className="btn btn-ghost btn-icon" onClick={onClose} type="button"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <SectionLabel>Company</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label className="crm-label">Company name *</label>
              <input className="crm-input" value={form.company_name}
                onChange={e => set('company_name', e.target.value)} placeholder="e.g. Steel Masters Co." required />
            </div>
            <div>
              <label className="crm-label">Entity</label>
              <select className="crm-input" value={form.entity} onChange={e => set('entity', e.target.value)}>
                <option value="EG">Egypt</option>
                <option value="KSA">KSA</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label className="crm-label">Lead source</label>
            <select className="crm-input" value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
              {SOURCES.map(s => <option key={s} value={s}>{t(`source.${s}`)}</option>)}
            </select>
          </div>
          <SectionLabel>Contact</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label className="crm-label">Name</label>
              <input className="crm-input" value={form.contact_name}
                onChange={e => set('contact_name', e.target.value)} placeholder="Ahmed Hassan" />
            </div>
            <div>
              <label className="crm-label">Title</label>
              <input className="crm-input" value={form.contact_title}
                onChange={e => set('contact_title', e.target.value)} placeholder="Procurement Manager" />
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label className="crm-label">Phone</label>
            <input className="crm-input" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+20 10x xxxx xxxx" type="tel" />
          </div>
          <SectionLabel>Financials</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div>
              <label className="crm-label">Est. GMV / month (EGP)</label>
              <input className="crm-input" value={form.estimated_gmv_month}
                onChange={e => set('estimated_gmv_month', e.target.value)} placeholder="50000" type="number" min="0" />
            </div>
            <div>
              <label className="crm-label">Deal probability (%)</label>
              <input className="crm-input" value={form.deal_success_rate}
                onChange={e => set('deal_success_rate', e.target.value)} placeholder="50" type="number" min="0" max="100" />
            </div>
          </div>
          <SectionLabel>Next action</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '10px', marginBottom: '24px' }}>
            <div>
              <label className="crm-label">Action description</label>
              <input className="crm-input" value={form.next_action}
                onChange={e => set('next_action', e.target.value)} placeholder="Send proposal" />
            </div>
            <div>
              <label className="crm-label">Due date</label>
              <input className="crm-input" value={form.next_action_date}
                onChange={e => set('next_action_date', e.target.value)} type="date" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost btn-md" onClick={onClose}>{t('action.cancel')}</button>
            <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
              {saving ? 'Saving…' : t('action.add') + ' Lead'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--text-muted)',
      marginBottom: '10px', paddingBottom: '5px',
      borderBottom: '1px solid var(--border-default)',
    }}>
      {children}
    </div>
  )
}