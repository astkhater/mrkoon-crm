/**
 * LeadPanel — right slide-in panel for lead detail, stage change, and activity logging
 * Opened by clicking a LeadCard. Closes on backdrop click or X button.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, User, Phone, Calendar, ChevronDown, Mail } from 'lucide-react'
import { supabase }    from '@/lib/supabase'
import { useAuth }     from '@/contexts/AuthContext'
import { useApp }      from '@/contexts/AppContext'
import { formatDate, formatEGP } from '@/lib/i18n'

// ── Constants ─────────────────────────────────────────────────
const ALL_PIPELINE_STAGES = [
  'new_lead', 'reaching_out', 'no_response', 'meeting_done',
  'negotiation', 'prospect_active', 'prospect_cold', 'reconnect',
  'client_active', 'lost', 'unqualified',
]

const STAGE_COLORS = {
  new_lead: '#64748b', reaching_out: '#3b82f6', no_response: '#6366f1',
  meeting_done: '#8b5cf6', negotiation: '#f59e0b', prospect_active: '#22c55e',
  prospect_cold: '#94a3b8', reconnect: '#f97316', client_active: '#22c55e',
  client_inactive: '#ef4444', client_renewal: '#f59e0b',
  lost: '#ef4444', unqualified: '#475569',
}

const ACTIVITY_TYPES = [
  { key: 'note',           icon: '📝' },
  { key: 'call',           icon: '📞' },
  { key: 'whatsapp',       icon: '💬' },
  { key: 'meeting_online', icon: '💻' },
  { key: 'meeting_onsite', icon: '🤝' },
  { key: 'site_visit',     icon: '🏭' },
]

const ACTIVITY_ICONS = {
  note: '📝', call: '📞', whatsapp: '💬',
  meeting_online: '💻', meeting_onsite: '🤝', site_visit: '🏭',
  email: '✉️', document: '📄', stage_change: '🔄', status_change: '🔁', sna_alert: '⚠️',
}

// ── Data hooks ────────────────────────────────────────────────
function useLead(leadId) {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, profiles!leads_assigned_to_fkey(id, full_name)')
        .eq('id', leadId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!leadId,
  })
}

function useActivities(leadId) {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, profiles!activities_performed_by_fkey(full_name)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(25)
      if (error) throw error
      return data ?? []
    },
    enabled: !!leadId,
  })
}

// ── Sub-components ────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon, alert }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: alert ? '#ef4444' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {Icon && <Icon size={11} />}
        {value}
      </div>
    </div>
  )
}

function ActivityItem({ activity, lang }) {
  const { t } = useApp()
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: '10px' }}>
      <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>
        {ACTIVITY_ICONS[activity.action_type] ?? '•'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Stage change */}
        {activity.stage_from && activity.stage_to && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            {t('stage.' + activity.stage_from) + ' → ' + t('stage.' + activity.stage_to)}
          </div>
        )}
        {/* Body */}
        {activity.body && (
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {activity.body}
          </div>
        )}
        {/* Contact */}
        {activity.contact_person && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
            {'with ' + activity.contact_person + (activity.contact_title ? ', ' + activity.contact_title : '')}
          </div>
        )}
        {/* Meta */}
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {(activity.profiles?.full_name ?? '') + ' · ' + formatDate(activity.created_at, lang)}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function LeadPanel({ leadId, onClose }) {
  const { t, lang, toast } = useApp()
  const { userId }         = useAuth()
  const queryClient        = useQueryClient()

  const [showStageMenu,  setShowStageMenu]  = useState(false)
  const [actType,        setActType]        = useState('note')
  const [actBody,        setActBody]        = useState('')
  const [actContact,     setActContact]     = useState('')
  const [actTitle,       setActTitle]       = useState('')
  const [saving,         setSaving]         = useState(false)
  const [editDealValue,  setEditDealValue]  = useState(false)
  const [dealValueInput, setDealValueInput] = useState('')

  const { data: lead,       isLoading } = useLead(leadId)
  const { data: activities = []       } = useActivities(leadId)

  const weightedGMV = lead?.estimated_gmv_month && lead?.deal_success_rate != null
    ? Math.round(lead.estimated_gmv_month * lead.deal_success_rate / 100)
    : null

  // ── Stage change ──────────────────────────────────────────
  async function changeStage(newStage) {
    const { error } = await supabase.from('leads').update({ stage: newStage }).eq('id', leadId)
    if (error) { toast(error.message, 'error'); return }
    queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] })
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
    queryClient.invalidateQueries({ queryKey: ['cco-stats'] })
    setShowStageMenu(false)
    toast('Stage updated', 'success')
  }

  // ── Save deal value ───────────────────────────────────────
  async function saveDealValue() {
    const val = parseFloat(dealValueInput)
    if (isNaN(val) && dealValueInput.trim() !== '') return
    const { error } = await supabase.from('leads')
      .update({ deal_value: dealValueInput.trim() === '' ? null : val })
      .eq('id', leadId)
    if (error) { toast(error.message, 'error'); return }
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
    setEditDealValue(false)
    toast('Deal value saved', 'success')
  }

  // ── Log activity ───────────────────────────────────────────
  async function handleLogActivity(e) {
    e.preventDefault()
    if (!actBody.trim()) return
    setSaving(true)
    const { error } = await supabase.from('activities').insert({
      lead_id:        leadId,
      performed_by:   userId,
      action_type:    actType,
      body:           actBody.trim(),
      contact_person: actContact.trim() || null,
      contact_title:  actTitle.trim()   || null,
    })
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setActBody(''); setActContact(''); setActTitle('')
    queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] })
    toast('Activity logged', 'success')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, insetInlineEnd: 0, bottom: 0, zIndex: 50,
        width: '480px', maxWidth: '100vw',
        background: 'var(--bg-surface)',
        borderInlineStart: '1px solid var(--border-default)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.35)',
      }}>

        {isLoading || !lead ? (
          <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            {isLoading ? t('misc.loading') : 'Lead not found'}
          </div>
        ) : (
          <>
            {/* ── Header ─────────────────────────────────── */}
            <div style={{
              padding: '14px 18px', flexShrink: 0,
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>
                    {lead.company_name}
                  </div>
                  {/* Stage selector */}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      onClick={() => setShowStageMenu(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '3px 8px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                        background: (STAGE_COLORS[lead.stage] ?? '#64748b') + '22',
                        color: STAGE_COLORS[lead.stage] ?? '#64748b',
                        fontSize: '11px', fontWeight: 700,
                      }}
                    >
                      {t('stage.' + lead.stage)}
                      <ChevronDown size={10} />
                    </button>

                    {showStageMenu && (
                      <div style={{
                        position: 'absolute', top: '110%', insetInlineStart: 0, zIndex: 60,
                        background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                        borderRadius: '8px', minWidth: '190px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
                      }}>
                        {ALL_PIPELINE_STAGES.map(stage => (
                          <button key={stage}
                            onClick={() => changeStage(stage)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'start',
                              padding: '8px 14px', border: 'none', cursor: 'pointer',
                              background: stage === lead.stage ? 'var(--bg-hover)' : 'transparent',
                              color: stage === lead.stage
                                ? (STAGE_COLORS[stage] ?? 'var(--text-primary)')
                                : 'var(--text-secondary)',
                              fontSize: '12px', fontWeight: stage === lead.stage ? 700 : 400,
                            }}
                          >
                            {t('stage.' + stage)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ flexShrink: 0 }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Scrollable body ─────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginBottom: '16px' }}>
                <InfoRow label="Assigned To" value={lead.profiles?.full_name} icon={User} />
                <InfoRow label="Source"      value={t('source.' + (lead.lead_source ?? 'unknown'))} />
                <InfoRow label="Contact"     value={lead.contact_name}  icon={User} />
                <InfoRow label="Title"       value={lead.contact_title} />
                <InfoRow label="Phone"       value={lead.phone} icon={Phone} />
                <InfoRow label="Email"       value={lead.email} icon={Mail} />
                <InfoRow label="Entity"      value={lead.entity} />
                <InfoRow label="Added"       value={formatDate(lead.date_added, lang)} />
                {lead.next_action_date && (
                  <InfoRow
                    label="Next Action"
                    value={formatDate(lead.next_action_date, lang) + (lead.next_action ? ' — ' + lead.next_action : '')}
                    icon={Calendar}
                    alert={new Date(lead.next_action_date) < new Date()}
                  />
                )}
              </div>

              {/* Financial card */}
              <div className="crm-card" style={{ marginBottom: '16px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Pipeline Value
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {lead.estimated_gmv_month && (
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Est. GMV/mo</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--brand-green)' }}>
                        {formatEGP(lead.estimated_gmv_month)}
                      </div>
                    </div>
                  )}
                  {lead.deal_success_rate != null && (
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Probability</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {lead.deal_success_rate}%
                      </div>
                    </div>
                  )}
                  {weightedGMV != null && (
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Weighted GMV</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                        {formatEGP(weightedGMV)}
                      </div>
                    </div>
                  )}
                  {/* Deal value always shown, editable */}
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Deal Value
                      {!editDealValue && (
                        <button
                          onClick={() => { setDealValueInput(lead.deal_value ?? ''); setEditDealValue(true) }}
                          style={{ marginLeft: '6px', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-cyan)' }}
                        >edit</button>
                      )}
                    </div>
                    {editDealValue ? (
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <input
                          className="crm-input"
                          type="number"
                          placeholder="0"
                          value={dealValueInput}
                          onChange={e => setDealValueInput(e.target.value)}
                          style={{ width: '110px', height: '28px', fontSize: '12px', padding: '4px 8px' }}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveDealValue(); if (e.key === 'Escape') setEditDealValue(false) }}
                        />
                        <button onClick={saveDealValue} className="btn btn-primary btn-xs">✓</button>
                        <button onClick={() => setEditDealValue(false)} className="btn btn-ghost btn-xs">✕</button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '17px', fontWeight: 700, color: lead.deal_value ? '#a78bfa' : 'var(--text-muted)' }}>
                        {lead.deal_value ? formatEGP(lead.deal_value) : '—'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="crm-card" style={{ marginBottom: '16px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Notes
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {lead.notes}
                  </div>
                </div>
              )}

              {/* Log Activity form */}
              <div className="crm-card" style={{ marginBottom: '16px', padding: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Log Activity
                </div>
                <form onSubmit={handleLogActivity}>
                  {/* Type tabs */}
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {ACTIVITY_TYPES.map(({ key, icon }) => (
                      <button key={key} type="button"
                        onClick={() => setActType(key)}
                        className={'btn btn-xs ' + (actType === key ? 'btn-primary' : 'btn-secondary')}
                      >
                        {icon + ' ' + key.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Contact row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input
                      className="crm-input"
                      style={{ height: '32px', fontSize: '12px' }}
                      placeholder="Contact name (optional)"
                      value={actContact}
                      onChange={e => setActContact(e.target.value)}
                    />
                    <input
                      className="crm-input"
                      style={{ height: '32px', fontSize: '12px' }}
                      placeholder="Title (optional)"
                      value={actTitle}
                      onChange={e => setActTitle(e.target.value)}
                    />
                  </div>

                  {/* Body */}
                  <textarea
                    className="crm-input"
                    placeholder={actType.replace('_', ' ') + ' notes...'}
                    value={actBody}
                    onChange={e => setActBody(e.target.value)}
                    rows={3}
                    required
                    style={{ height: 'auto', resize: 'vertical', marginBottom: '8px', padding: '8px 12px', lineHeight: 1.5 }}
                  />

                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !actBody.trim()}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </div>

              {/* Activity log */}
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {'Activity Log (' + activities.length + ')'}
                </div>
                {activities.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    No activities yet
                  </div>
                ) : (
                  activities.map(a => <ActivityItem key={a.id} activity={a} lang={lang} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
