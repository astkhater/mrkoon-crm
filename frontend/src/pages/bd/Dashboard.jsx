import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Phone, Calendar } from 'lucide-react'
import TopBar    from '@/components/layout/TopBar'
import { useApp }  from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatEGP, formatDate } from '@/lib/i18n'

const STAGE_COLORS = {
  new_lead: '#64748b',       reaching_out: '#3b82f6',
  no_response: '#6366f1',    meeting_done: '#8b5cf6',
  negotiation: '#f59e0b',    prospect_active: '#22d3ee',
  reconnect: '#f97316',      client_active: '#22c55e',
  client_inactive: '#ef4444', unqualified: '#475569',
}

function useBDStats(userId) {
  return useQuery({
    queryKey: ['bd-stats', userId],
    queryFn: async () => {
      const [
        { data: stageCounts },
        { data: pipeline },
        { data: todayActions },
      ] = await Promise.all([
        supabase.from('leads').select('stage').eq('assigned_to', userId),
        supabase.from('v_weighted_pipeline').select('*').eq('assigned_to', userId),
        supabase.from('leads')
          .select('id, company_name, stage, contact_name, next_action, next_action_date, phone')
          .eq('assigned_to', userId)
          .not('stage', 'in', '(client_active,client_inactive,client_renewal,lost,unqualified)')
          .lte('next_action_date', (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })())
          .not('next_action_date', 'is', null)
          .order('next_action_date')
          .limit(30),
      ])
      const byStage = {}
      stageCounts?.forEach(r => { byStage[r.stage] = (byStage[r.stage] ?? 0) + 1 })
      const totalLeads  = stageCounts?.length ?? 0
      const weightedGMV = pipeline?.reduce((s, r) => s + (r.weighted_gmv_month ?? 0), 0) ?? 0
      return { byStage, totalLeads, weightedGMV, pipeline: pipeline ?? [], todayActions: todayActions ?? [] }
    },
    enabled: !!userId,
    refetchInterval: 120_000,
  })
}

function StageChip({ stage, count }) {
  const color = STAGE_COLORS[stage] ?? '#64748b'
  const label = stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 12px', borderRadius: '6px', background: color + '12', border: '1px solid ' + color + '30' }}>
      <span style={{ fontSize: '12px', color, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color }}>{count}</span>
    </div>
  )
}

function ActionRow({ lead }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
        background: STAGE_COLORS[lead.stage] ?? '#64748b' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.company_name}</div>
        {lead.contact_name && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{lead.contact_name}</div>}
        {lead.next_action && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{lead.next_action}</div>}
      </div>
      {lead.phone && <a href={'tel:' + lead.phone} className="btn btn-ghost btn-icon" title="Call"><Phone size={13} /></a>}
    </div>
  )
}

function groupByDate(leads, lang) {
  const today    = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const groups   = {}
  for (const lead of leads) {
    const key = lead.next_action_date
    if (!groups[key]) groups[key] = []
    groups[key].push(lead)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
    date,
    label: date < today  ? 'Overdue (' + formatDate(date, lang) + ')'
         : date === today ? 'Today - ' + formatDate(date, lang)
         : date === tomorrow ? 'Tomorrow - ' + formatDate(date, lang)
         : formatDate(date, lang),
    overdue: date < today,
    items,
  }))
}

export default function BDDashboard() {
  const { t, lang } = useApp()
  const { userId }  = useAuth()
  const navigate    = useNavigate()
  const { data, isLoading } = useBDStats(userId)

  const actions = (
    <button className="btn btn-primary btn-sm"><Plus size={13} /> {t('bd.add_lead')}</button>
  )

  if (isLoading) return (
    <><TopBar title={t('bd.title')} actions={actions} /><div className="page-content"><div className="t3 text-sm">{t('misc.loading')}</div></div></>
  )

  return (
    <>
      <TopBar title={t('bd.title')} actions={actions} />
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div className="kpi-card"><div className="kpi-label">{t('bd.my_leads')}</div><div className="kpi-value">{data?.totalLeads ?? '-'}</div></div>
          <div className="kpi-card">
            <div className="kpi-label">{t('bd.my_gmv')}</div>
            <div className="kpi-value" style={{ color: 'var(--brand-cyan)' }}>{formatEGP(data?.weightedGMV)} <span style={{ fontSize: '13px', fontWeight: 400 }}>/ mo</span></div>
          </div>
          <div className="kpi-card"><div className="kpi-label">{t('bd.call_queue')}</div><div className="kpi-value">{data?.todayActions?.length ?? 0}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="crm-card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('nav.pipeline')}</span>
            </div>
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(data?.byStage ?? {}).sort((a, b) => b[1] - a[1]).map(([stage, count]) => (
                <StageChip key={stage} stage={stage} count={count} />
              ))}
              {Object.keys(data?.byStage ?? {}).length === 0 && (
                <div className="t3 text-sm" style={{ padding: '12px', textAlign: 'center' }}>{t('misc.empty')}</div>
              )}
            </div>
          </div>

          <div className="crm-card" style={{ padding: 0, maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} color="var(--brand-cyan)" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Upcoming Actions</span>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate('/calendar')}>Full calendar</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {(() => {
                const groups = groupByDate(data?.todayActions ?? [], lang)
                if (groups.length === 0) return (
                  <div className="t3 text-sm" style={{ padding: '24px', textAlign: 'center' }}>{t('misc.empty')}</div>
                )
                return groups.map(({ date, label, overdue, items }) => (
                  <div key={date}>
                    <div style={{ padding: '5px 14px', fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: overdue ? '#ef4444' : 'var(--text-muted)',
                      background: overdue ? 'rgba(239,68,68,0.06)' : 'var(--bg-hover)',
                      borderBottom: '1px solid var(--border-default)' }}>
                      {label}
                    </div>
                    {items.map(lead => <ActionRow key={lead.id} lead={lead} />)}
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
