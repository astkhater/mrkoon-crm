import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, TrendingUp, Users, DollarSign, ArrowRight, Calendar, Inbox } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TopBar    from '@/components/layout/TopBar'
import { useApp }  from '@/contexts/AppContext'
import { supabase } from '@/lib/supabase'
import { formatEGP, formatDate } from '@/lib/i18n'

// -- Data fetching
function useCCOStats() {
  return useQuery({
    queryKey: ['cco-stats'],
    queryFn: async () => {
      const [
        { count: totalLeads },
        { data: pipelineSummary },
        { count: snaBreached },
        { count: pendingHandoffs },
        { data: upcomingActions },
        { count: poolCount },
        { data: poolLeads },
        { data: repsData },
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('v_pipeline_summary_by_rep').select('*'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('is_sna', true),
        supabase.from('handoffs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('leads')
          .select('id, company_name, stage, contact_name, next_action, next_action_date, profiles:assigned_to(full_name)')
          .not('stage', 'in', '(client_active,client_inactive,client_renewal,lost,unqualified)')
          .lte('next_action_date', (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })())
          .not('next_action_date', 'is', null)
          .order('next_action_date')
          .limit(40),
        supabase.from('leads').select('id', { count: 'exact', head: true }).is('assigned_to', null),
        supabase.from('leads')
          .select('id, company_name, stage, contact_name, phone, lead_source, area_city, created_at')
          .is('assigned_to', null)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('profiles')
          .select('id, full_name, role')
          .in('role', ['bd_rep', 'bd_tl', 'bd_am'])
          .order('full_name'),
      ])

      const totalWeightedGMV   = pipelineSummary?.reduce((s, r) => s + (r.total_weighted_gmv_month   ?? 0), 0) ?? 0
      const totalContractedGMV = pipelineSummary?.reduce((s, r) => s + (r.total_contracted_gmv_month ?? 0), 0) ?? 0
      const totalRealizedGMV   = pipelineSummary?.reduce((s, r) => s + (r.total_realized_gmv         ?? 0), 0) ?? 0

      return {
        totalLeads:        totalLeads   ?? 0,
        snaBreached:       snaBreached  ?? 0,
        pendingHandoffs:   pendingHandoffs ?? 0,
        totalWeightedGMV,
        totalContractedGMV,
        totalRealizedGMV,
        reps:              pipelineSummary ?? [],
        upcomingActions:   upcomingActions ?? [],
        poolCount:         poolCount ?? 0,
        poolLeads:         poolLeads ?? [],
        repsList:          repsData ?? [],
      }
    },
    refetchInterval: 60_000,
  })
}

// -- KPI Card
function KpiCard({ label, value, sub, accent, icon: Icon, alert }) {
  return (
    <div className="kpi-card" style={{
      borderColor: alert ? 'rgba(239,68,68,0.3)' : undefined,
      background:  alert ? 'rgba(239,68,68,0.05)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value" style={{ color: accent ?? 'var(--text-primary)' }}>{value}</div>
          {sub && <div className="kpi-sub">{sub}</div>}
        </div>
        {Icon && (
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: alert ? 'rgba(239,68,68,0.1)' : 'rgba(34,211,238,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} color={alert ? '#ef4444' : 'var(--brand-cyan)'} />
          </div>
        )}
      </div>
    </div>
  )
}

// -- Rep row
function RepRow({ rep }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 60px 60px 90px 90px 90px',
      gap: '8px', alignItems: 'center',
      padding: '10px 14px',
      borderBottom: '1px solid var(--border-default)',
      fontSize: '12px',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{rep.rep_name}</div>
      <div style={{ color: 'var(--text-secondary)' }}>{rep.count_client_active}</div>
      <div style={{ color: rep.count_sna_breached > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
        {rep.count_sna_breached > 0 ? '\u26a0 ' : ''}{rep.count_sna_breached}
      </div>
      <div style={{ color: 'var(--brand-cyan)' }}>{formatEGP(rep.total_weighted_gmv_month)}</div>
      <div style={{ color: 'var(--brand-green)' }}>{formatEGP(rep.total_contracted_gmv_month)}</div>
      <div style={{ color: 'var(--text-secondary)' }}>{formatEGP(rep.total_realized_gmv)}</div>
    </div>
  )
}

// -- Action row
function ActionRow({ lead, lang }) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = lead.next_action_date && lead.next_action_date < today
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 14px', borderBottom: '1px solid var(--border-default)',
      fontSize: '12px',
    }}>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '4px',
        background: isOverdue ? '#ef4444' : 'var(--brand-cyan)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.company_name}</div>
        {lead.profiles?.full_name && (
          <div style={{ fontSize: '11px', color: 'var(--brand-cyan)', marginTop: '1px' }}>{lead.profiles.full_name}</div>
        )}
        {lead.next_action && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.next_action}</div>
        )}
      </div>
      <div style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {formatDate(lead.next_action_date, lang)}
      </div>
    </div>
  )
}

// -- Pool lead row with assign dropdown
function PoolRow({ lead, reps, onAssign }) {
  const [assigning, setAssigning] = useState(false)

  const handleAssign = async (repId) => {
    if (!repId) return
    setAssigning(true)
    await onAssign(lead.id, repId)
    setAssigning(false)
  }

  const STAGE_COLORS = {
    prospect_active: '#22c55e', prospect_inactive: '#6b7280', reaching_out: '#3b82f6',
    no_response: '#9ca3af', reconnect: '#f59e0b', meeting_done: '#8b5cf6',
    negotiation: '#06b6d4', client_active: '#22c55e',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderBottom: '1px solid var(--border-default)',
      fontSize: '12px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.company_name}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
          {lead.contact_name && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.contact_name}</span>
          )}
          {lead.area_city && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.area_city}</span>
          )}
          <span style={{
            fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
            background: 'var(--bg-hover)', color: STAGE_COLORS[lead.stage] ?? 'var(--text-muted)',
            fontWeight: 600, letterSpacing: '0.03em',
          }}>
            {lead.stage?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <select
        className="crm-input"
        style={{ width: '130px', fontSize: '11px', padding: '4px 8px', flexShrink: 0 }}
        disabled={assigning}
        defaultValue=""
        onChange={e => handleAssign(e.target.value)}
      >
        <option value="" disabled>Assign to rep...</option>
        {reps.map(r => (
          <option key={r.id} value={r.id}>{r.full_name}</option>
        ))}
      </select>
    </div>
  )
}

// -- Main CCO dashboard
export default function CCODashboard() {
  const { t, lang, toast } = useApp()
  const navigate            = useNavigate()
  const queryClient         = useQueryClient()
  const { data, isLoading, error } = useCCOStats()

  const handleAssign = async (leadId, repId) => {
    const { error: updateErr } = await supabase
      .from('leads')
      .update({ assigned_to: repId })
      .eq('id', leadId)
    if (updateErr) {
      toast('Failed to assign lead', 'error')
    } else {
      queryClient.invalidateQueries({ queryKey: ['cco-stats'] })
    }
  }

  if (isLoading) return (
    <>
      <TopBar title={t('cco.title')} />
      <div className="page-content">
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('misc.loading')}</div>
      </div>
    </>
  )

  if (error) return (
    <>
      <TopBar title={t('cco.title')} />
      <div className="page-content">
        <div style={{ color: '#ef4444', fontSize: '13px' }}>{t('misc.error')}: {error.message}</div>
      </div>
    </>
  )

  return (
    <>
      <TopBar title={t('cco.title')} />

      <div className="page-content">

        {data.snaBreached > 0 && (
          <div style={{
            padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
              {data.snaBreached} SNA {data.snaBreached === 1 ? 'breach' : 'breaches'} require immediate attention
            </span>
            <button
              className="btn btn-danger btn-sm"
              style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => navigate('/accounts')}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px', marginBottom: '24px',
        }}>
          <KpiCard label={t('cco.total_leads')} value={data.totalLeads.toLocaleString()} icon={Users} />
          <KpiCard
            label="Pool" value={data.poolCount.toLocaleString()}
            sub="unassigned leads" accent="var(--brand-cyan)" icon={Inbox}
          />
          <KpiCard
            label={t('cco.weighted_gmv')} value={formatEGP(data.totalWeightedGMV)}
            sub="weighted pipeline" accent="var(--brand-cyan)" icon={TrendingUp}
          />
          <KpiCard
            label={t('cco.contracted_gmv')} value={formatEGP(data.totalContractedGMV)}
            sub="signed contracts" accent="var(--brand-green)" icon={DollarSign}
          />
          <KpiCard
            label={t('cco.realized_gmv')} value={formatEGP(data.totalRealizedGMV)}
            sub="actual transactions" icon={DollarSign}
          />
          <KpiCard
            label={t('cco.sna_breached')} value={data.snaBreached}
            alert={data.snaBreached > 0} icon={AlertTriangle}
          />
          <KpiCard label={t('cco.pending_handoffs')} value={data.pendingHandoffs} icon={Users} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '16px' }}>

          <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('cco.rep_grid')}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '140px 60px 60px 90px 90px 90px',
              gap: '8px', padding: '7px 14px',
              background: 'var(--bg-hover)',
              borderBottom: '1px solid var(--border-default)',
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text-muted)',
            }}>
              <div>Rep</div><div>Active</div><div>SNA</div>
              <div>Weighted</div><div>Contracted</div><div>Realized</div>
            </div>
            {data.reps.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                {t('misc.empty')}
              </div>
            ) : (
              data.reps.map((rep, i) => <RepRow key={i} rep={rep} />)
            )}
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
              {data.upcomingActions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t('misc.empty')}
                </div>
              ) : (
                data.upcomingActions.map(lead => <ActionRow key={lead.id} lead={lead} lang={lang} />)
              )}
            </div>
          </div>

        </div>

        <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={14} color="var(--brand-cyan)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Pool</span>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                background: 'rgba(34,211,238,0.1)', color: 'var(--brand-cyan)', fontWeight: 600,
              }}>
                {data.poolCount} unassigned
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Select a rep from the dropdown to assign
            </div>
          </div>

          {data.poolLeads.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              Pool is empty
            </div>
          ) : (
            <>
              {data.poolLeads.map(lead => (
                <PoolRow
                  key={lead.id}
                  lead={lead}
                  reps={data.repsList}
                  onAssign={handleAssign}
                />
              ))}
              {data.poolCount > 50 && (
                <div style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-default)' }}>
                  Showing 50 of {data.poolCount} pool leads
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </>
  )
}
