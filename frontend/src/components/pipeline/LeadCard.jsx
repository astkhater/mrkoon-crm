/**
 * LeadCard — compact kanban card for the Pipeline board
 * Displays: company name, rep (managers only), GMV × probability, source, next action date
 */
import { AlertTriangle, Calendar, Clock } from 'lucide-react'
import { useApp }  from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatEGP } from '@/lib/i18n'

const SOURCE_COLORS = {
  campaign:           '#6366f1',
  referral:           '#22c55e',
  cold_outreach:      '#3b82f6',
  whatsapp:           '#25d366',
  platform_app:       '#f59e0b',
  exhibition:         '#8b5cf6',
  linkedin:           '#0077b5',
  facebook_instagram: '#e1306c',
  unknown:            '#64748b',
}

export default function LeadCard({ lead, onClick }) {
  const { t, lang } = useApp()
  const { isManager } = useAuth()

  const isOverdue    = lead.next_action_date && new Date(lead.next_action_date) < new Date()
  const daysSinceAdded = lead.date_added
    ? Math.floor((Date.now() - new Date(lead.date_added).getTime()) / 86_400_000)
    : null
  const weightedGMV  = lead.estimated_gmv_month && lead.deal_success_rate
    ? Math.round(lead.estimated_gmv_month * lead.deal_success_rate / 100)
    : null
  const sourceColor  = SOURCE_COLORS[lead.lead_source] ?? '#64748b'

  return (
    <div
      onClick={() => onClick(lead)}
      style={{
        background:    'var(--bg-card)',
        border:        `1px solid ${lead.is_sna ? 'rgba(239,68,68,0.35)' : 'var(--border-default)'}`,
        borderRadius:  '7px',
        padding:       '10px 11px',
        cursor:        'pointer',
        transition:    'border-color 120ms, box-shadow 120ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.25)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = lead.is_sna ? 'rgba(239,68,68,0.35)' : 'var(--border-default)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      {lead.is_sna && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          color: '#ef4444', fontSize: '10px', fontWeight: 700,
          marginBottom: '5px', padding: '2px 5px', borderRadius: '4px',
          background: 'rgba(239,68,68,0.1)', width: 'fit-content',
        }}>
          <AlertTriangle size={9} /> SNA BREACH
        </div>
      )}

      <div style={{
        fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)',
        marginBottom: '3px', lineHeight: 1.3,
      }}>
        {lead.company_name}
      </div>

      {isManager && lead.profiles?.full_name && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {lead.profiles.full_name}
        </div>
      )}

      {lead.estimated_gmv_month && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--brand-green)', fontWeight: 700 }}>
            {formatEGP(lead.estimated_gmv_month)}
          </span>
          {lead.deal_success_rate != null && (
            <>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                x{lead.deal_success_rate}%
              </span>
              {weightedGMV && (
                <span style={{ fontSize: '11px', color: 'var(--brand-cyan)' }}>
                  = {formatEGP(weightedGMV)}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {lead.lead_source && lead.lead_source !== 'unknown' && (
        <div style={{ marginBottom: '5px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 600,
            padding: '1px 6px', borderRadius: '4px',
            background: `${sourceColor}22`, color: sourceColor,
          }}>
            {t(`source.${lead.lead_source}`)}
          </span>
        </div>
      )}

      {lead.next_action_date && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '11px',
          color: isOverdue ? '#ef4444' : 'var(--text-muted)',
        }}>
          <Calendar size={10} />
          <span>{formatDate(lead.next_action_date, lang)}</span>
          {lead.next_action && (
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '120px',
            }}>
              {' · '}{lead.next_action}
            </span>
          )}
        </div>
      )}

      {daysSinceAdded !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px',
        }}>
          <Clock size={9} />
          <span>{daysSinceAdded}d in CRM</span>
        </div>
      )}
    </div>
  )
}
