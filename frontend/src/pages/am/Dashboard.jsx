import { useQuery } from '@tanstack/react-query'
import { Clock, AlertTriangle, RefreshCw, Users, TrendingUp } from 'lucide-react'
import TopBar    from '@/components/layout/TopBar'
import { useApp }  from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatEGP, formatDate } from '@/lib/i18n'

const AM_PORTFOLIO_CAP = 60 // system_settings: am_portfolio_cap

function useAMStats(userId) {
  return useQuery({
    queryKey: ['am-stats', userId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)

      const [
        { data: portfolio },
        { data: handoffQueue },
        { data: renewalAlerts },
        { data: snaClients },
      ] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, lead_id, am_id, contracted_gmv_month, realized_gmv, contract_start_date, contract_end_date, handoff_due_date, leads(company_name, contact_name, phone, stage)')
          .eq('am_id', userId)
          .eq('status', 'active'),
        supabase
          .from('accounts')
          .select('id, lead_id, contracted_gmv_month, handoff_due_date, leads(company_name, contact_name)')
          .is('am_id', null)
          .lte('handoff_due_date', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .order('handoff_due_date'),
        supabase
          .from('accounts')
          .select('id, lead_id, contract_end_date, contracted_gmv_month, leads(company_name)')
          .eq('am_id', userId)
          .eq('status', 'active')
          .lte('contract_end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .gte('contract_end_date', today)
          .order('contract_end_date'),
        supabase
          .from('leads')
          .select('id, company_name, contact_name, stage, sna_since')
          .eq('am_id', userId)
          .eq('is_sna', true),
      ])

      const portfolioCount    = portfolio?.length ?? 0
      const totalContractedGMV = portfolio?.reduce((s, a) => s + (a.contracted_gmv_month ?? 0), 0) ?? 0
      const totalRealizedGMV   = portfolio?.reduce((s, a) => s + (a.realized_gmv ?? 0), 0) ?? 0
      const capacityPct        = Math.round((portfolioCount / AM_PORTFOLIO_CAP) * 100)

      return {
        portfolio:        portfolio ?? [],
        handoffQueue:     handoffQueue ?? [],
        renewalAlerts:    renewalAlerts ?? [],
        snaClients:       snaClients ?? [],
        portfolioCount,
        totalContractedGMV,
        totalRealizedGMV,
        capacityPct,
      }
    },
    enabled: !!userId,
    refetchInterval: 60_000,
  })
}

function CapacityBar({ count, pct }) {
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : 'var(--brand-green)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Portfolio capacity
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>
          {count} / {AM_PORTFOLIO_CAP}
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-default)' }}>
        <div style={{
          height: '100%', borderRadius: '3px',
          width: (Math.min(pct, 100)) + '%',
          background: color,
          transition: 'width 400ms ease',
        }} />
      </div>
    </div>
  )
}

function HandoffRow({ account }) {
  const due    = new Date(account.handoff_due_date)
  const msLeft = due - Date.now()
  const hoursLeft = Math.max(0, Math.round(msLeft / 3_600_000))
  const urgent = hoursLeft <= 12

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderBottom: '1px solid var(--border-default)',
    }}>
      <Clock size={13} color={urgent ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {account.leads?.company_name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {account.leads?.contact_name}
        </div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div style={{ fontSize: '12px', color: formatEGP(account.contracted_gmv_month) ? 'var(--brand-cyan)' : 'var(--text-muted)' }}>
          {formatEGP(account.contracted_gmv_month)}/mo
        </div>
        <div style={{ fontSize: '11px', color: urgent ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
          {hoursLeft}h left
        </div>
      </div>
      <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
        Accept
      </button>
    </div>
  )
}

function RenewalRow({ account }) {
  const daysLeft = Math.ceil((new Date(account.contract_end_date) - Date.now()) / 86_400_000)
  const urgent   = daysLeft <= 7

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderBottom: '1px solid var(--border-default)',
    }}>
      <RefreshCw size={13} color={urgent ? '#ef4444' : 'var(--brand-cyan)'} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {account.leads?.company_name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Expires {formatDate(account.contract_end_date)}
        </div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div style={{ fontSize: '12px', color: 'var(--brand-green)' }}>
          {formatEGP(account.contracted_gmv_month)}/mo
        </div>
        <div style={{ fontSize: '11px', color: urgent ? '#ef4444' : 'var(--text-muted)', fontWeight: urgent ? 600 : 400 }}>
          {daysLeft}d
        </div>
      </div>
    </div>
  )
}

function SnaRow({ lead }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderBottom: '1px solid var(--border-default)',
    }}>
      <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {lead.company_name}
        </div>
        {lead.sna_since && (
          <div style={{ fontSize: '11px', color: '#ef4444' }}>
            SNA since {formatDate(lead.sna_since)}
          </div>
        )}
      </div>
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
        background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
      }}>
        SNA
      </span>
    </div>
  )
}

export default function AMDashboard() {
  const { t }   = useApp()
  const { userId } = useAuth()
  const { data, isLoading, error } = useAMStats(userId)

  if (isLoading) return (
    <>
      <TopBar title={t('am.title')} />
      <div className="page-content">
        <div className="t3 text-sm">{t('misc.loading')}</div>
      </div>
    </>
  )

  if (error) return (
    <>
      <TopBar title={t('am.title')} />
      <div className="page-content">
        <div style={{ color: '#ef4444', fontSize: '13px' }}>{t('misc.error')}: {error.message}</div>
      </div>
    </>
  )

  return (
    <>
      <TopBar title={t('am.title')} />
      <div className="page-content">

        {data.snaClients.length > 0 && (
          <div style={{
            padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
              {data.snaClients.length} SNA {data.snaClients.length === 1 ? 'client requires' : 'clients require'} immediate attention
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div className="kpi-card">
            <div className="kpi-label">{t('am.portfolio')}</div>
            <div className="kpi-value">{data.portfolioCount}</div>
            <div style={{ marginTop: '8px' }}>
              <CapacityBar count={data.portfolioCount} pct={data.capacityPct} />
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t('am.contracted_gmv')}</div>
            <div className="kpi-value" style={{ color: 'var(--brand-green)' }}>
              {formatEGP(data.totalContractedGMV)} <span style={{ fontSize: '13px', fontWeight: 400 }}>/ mo</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t('am.realized_gmv')}</div>
            <div className="kpi-value" style={{ color: 'var(--brand-cyan)' }}>
              {formatEGP(data.totalRealizedGMV)}
            </div>
          </div>
          <div className="kpi-card" style={{
            borderColor: data.handoffQueue.length > 0 ? 'rgba(245,158,11,0.3)' : undefined,
            background: data.handoffQueue.length > 0 ? 'rgba(245,158,11,0.05)' : undefined,
          }}>
            <div className="kpi-label">{t('am.pending_handoffs')}</div>
            <div className="kpi-value" style={{ color: data.handoffQueue.length > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
              {data.handoffQueue.length}
            </div>
          </div>
          <div className="kpi-card" style={{
            borderColor: data.renewalAlerts.length > 0 ? 'rgba(239,68,68,0.3)' : undefined,
            background: data.renewalAlerts.length > 0 ? 'rgba(239,68,68,0.05)' : undefined,
          }}>
            <div className="kpi-label">{t('am.renewals_due')}</div>
            <div className="kpi-value" style={{ color: data.renewalAlerts.length > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              {data.renewalAlerts.length}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          <div className="crm-card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('am.pending_handoffs')}</span>
              {data.handoffQueue.length > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px',
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                }}>
                  {data.handoffQueue.length}
                </span>
              )}
            </div>
            {data.handoffQueue.length === 0 ? (
              <div className="t3 text-sm" style={{ padding: '24px', textAlign: 'center' }}>{t('misc.empty')}</div>
            ) : (
              data.handoffQueue.map(a => <HandoffRow key={a.id} account={a} />)
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="crm-card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('am.renewals_due')} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>— next 30 days</span></span>
              </div>
              {data.renewalAlerts.length === 0 ? (
                <div className="t3 text-sm" style={{ padding: '24px', textAlign: 'center' }}>{t('misc.empty')}</div>
              ) : (
                data.renewalAlerts.map(a => <RenewalRow key={a.id} account={a} />)
              )}
            </div>

            {data.snaClients.length > 0 && (
              <div className="crm-card" style={{ padding: 0 }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>{t('am.sna_clients')}</span>
                </div>
                {data.snaClients.map(l => <SnaRow key={l.id} lead={l} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
