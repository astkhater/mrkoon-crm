/**
 * ReconnectQueue — leads that need re-engagement (stage = reconnect)
 * Sorted by next_action_date ASC (most overdue first)
 * One-click quick-log from the row; full detail via LeadPanel
 * Roles: CCO, TL, BD Rep
 */
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Calendar, Phone, MessageSquare, RefreshCw } from 'lucide-react'
import { supabase }      from '@/lib/supabase'
import { useAuth }       from '@/contexts/AuthContext'
import { useApp }        from '@/contexts/AppContext'
import { formatDate }    from '@/lib/i18n'
import TopBar            from '@/components/layout/TopBar'
import LeadPanel         from '@/components/pipeline/LeadPanel'

async function fetchReconnectLeads(userId, isManager, repFilter) {
  let q = supabase
    .from('leads')
    .select(`
      id, company_id, company_name, stage, entity, is_sna,
      contact_name, phone,
      next_action, next_action_date,
      date_added, assigned_to,
      profiles:assigned_to ( full_name )
    `)
    .eq('stage', 'reconnect')
    .order('next_action_date', { ascending: true, nullsFirst: false })

  if (!isManager) {
    q = q.eq('assigned_to', userId)
  } else if (repFilter) {
    q = q.eq('assigned_to', repFilter)
  }

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export default function ReconnectQueue() {
  const { userId, isManager }               = useAuth()
  const { t, lang, repFilter }              = useApp()
  const qc                                  = useQueryClient()

  const [selectedLead,  setSelectedLead]  = useState(null)
  const [loggingId,     setLoggingId]     = useState(null)
  const [logType,       setLogType]       = useState('call')
  const [logBody,       setLogBody]       = useState('')
  const [logSaving,     setLogSaving]     = useState(false)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['reconnect-leads', userId, isManager, repFilter],
    queryFn:  () => fetchReconnectLeads(userId, isManager, repFilter),
    staleTime: 30_000,
  })

  const now = new Date()
  const overdue  = useMemo(() => leads.filter(l => l.next_action_date && new Date(l.next_action_date) < now), [leads])
  const upcoming = useMemo(() => leads.filter(l => !l.next_action_date || new Date(l.next_action_date) >= now), [leads])

  async function quickLog(lead, type) {
    if (loggingId === lead.id) {
      setLogSaving(true)
      try {
        await supabase.from('activities').insert({
          lead_id:      lead.id,
          action_type:  type,
          body:         logBody.trim() || null,
          performed_by: userId,
        })
        qc.invalidateQueries({ queryKey: ['reconnect-leads'] })
        qc.invalidateQueries({ queryKey: ['activities', lead.id] })
        setLoggingId(null)
        setLogBody('')
      } catch (err) {
        console.error(err)
      } finally {
        setLogSaving(false)
      }
    } else {
      setLoggingId(lead.id)
      setLogType(type)
      setLogBody('')
    }
  }

  const actions = isManager ? (
    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
      {leads.length} leads in reconnect queue
    </div>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title={t('nav.reconnect')} actions={actions} />

      {!isLoading && overdue.length > 0 && (
        <div style={{
          padding: '8px 18px', flexShrink: 0,
          background: 'rgba(239,68,68,0.08)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: '7px',
          fontSize: '12px', color: '#ef4444', fontWeight: 600,
        }}>
          <AlertTriangle size={13} />
          {overdue.length} overdue — action required
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          {t('misc.loading')}
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <RefreshCw size={32} color="var(--text-muted)" />
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Queue is clear</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {overdue.length > 0 && (
            <Section
              title="Overdue" count={overdue.length} color="#ef4444" leads={overdue}
              isManager={isManager} lang={lang} t={t}
              loggingId={loggingId} logType={logType} logBody={logBody} logSaving={logSaving}
              setLogBody={setLogBody} onQuickLog={quickLog}
              onCancelLog={() => setLoggingId(null)} onOpenPanel={setSelectedLead}
            />
          )}
          {upcoming.length > 0 && (
            <Section
              title="Upcoming" count={upcoming.length} color="var(--text-muted)" leads={upcoming}
              isManager={isManager} lang={lang} t={t}
              loggingId={loggingId} logType={logType} logBody={logBody} logSaving={logSaving}
              setLogBody={setLogBody} onQuickLog={quickLog}
              onCancelLog={() => setLoggingId(null)} onOpenPanel={setSelectedLead}
            />
          )}
        </div>
      )}

      {selectedLead && (
        <LeadPanel leadId={selectedLead.id} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  )
}

function Section({ title, count, color, leads, isManager, lang, t, loggingId, logType, logBody, logSaving, setLogBody, onQuickLog, onCancelLog, onOpenPanel }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        marginBottom: '10px',
        fontSize: '11px', fontWeight: 700, color,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {title}
        <span style={{
          background: `${color}22`, color, padding: '1px 6px',
          borderRadius: '20px', fontWeight: 700,
        }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {leads.map(lead => (
          <ReconnectRow
            key={lead.id} lead={lead} isManager={isManager} lang={lang} t={t}
            isLogging={loggingId === lead.id} logType={logType} logBody={logBody}
            logSaving={logSaving} setLogBody={setLogBody}
            onQuickLog={onQuickLog} onCancelLog={onCancelLog} onOpenPanel={onOpenPanel}
          />
        ))}
      </div>
    </div>
  )
}

function ReconnectRow({ lead, isManager, lang, t, isLogging, logType, logBody, logSaving, setLogBody, onQuickLog, onCancelLog, onOpenPanel }) {
  const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date()

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border-default)'}`,
      borderRadius: '8px',
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div
          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
          onClick={() => onOpenPanel(lead)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            {lead.is_sna && <AlertTriangle size={11} color="#ef4444" style={{ flexShrink: 0 }} />}
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.company_name}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
              background: lead.entity === 'KSA' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
              color: lead.entity === 'KSA' ? '#22c55e' : '#3b82f6',
              flexShrink: 0,
            }}>
              {lead.entity}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {lead.contact_name && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {lead.contact_name}
              </span>
            )}
            {lead.next_action_date && (
              <span style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Calendar size={10} />
                {formatDate(lead.next_action_date, lang)}
              </span>
            )}
            {lead.next_action && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {lead.next_action}
              </span>
            )}
            {isManager && lead.profiles?.full_name && (
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: 'var(--brand-cyan)',
                padding: '1px 6px', borderRadius: '4px',
                background: 'rgba(34,211,238,0.08)',
              }}>
                {lead.profiles.full_name}
              </span>
            )}
          </div>
        </div>

        {!isLogging && (
          <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
            <button
              className="btn btn-ghost btn-xs"
              title="Log call"
              onClick={() => onQuickLog(lead, 'call')}
              style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Phone size={11} /> Call
            </button>
            <button
              className="btn btn-ghost btn-xs"
              title="Log WhatsApp"
              onClick={() => onQuickLog(lead, 'whatsapp')}
              style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <MessageSquare size={11} /> WA
            </button>
          </div>
        )}
      </div>

      {isLogging && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-default)', paddingTop: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Log {logType} — optional note:
          </div>
          <textarea
            className="crm-input"
            style={{ width: '100%', minHeight: '56px', resize: 'vertical', fontSize: '12px' }}
            placeholder="Add a note (optional)..."
            value={logBody}
            onChange={e => setLogBody(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button
              className="btn btn-primary btn-xs"
              onClick={() => onQuickLog(lead, logType)}
              disabled={logSaving}
            >
              {logSaving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={onCancelLog}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
