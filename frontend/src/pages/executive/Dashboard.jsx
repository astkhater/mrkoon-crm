import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TrendingUp, Users, Briefcase, RefreshCw, Globe, ArrowUpRight } from 'lucide-react'

const STAGES = [
  'new_lead','reaching_out','no_response','meeting_done','negotiation',
  'prospect_active','prospect_cold','reconnect','client_active',
  'client_inactive','client_renewal','lost','unqualified',
]
const ACTIVE_STAGES  = ['meeting_done','negotiation','prospect_active','client_active','client_renewal']
const CLIENT_STAGES  = ['client_active','client_renewal']

function KpiCard({ label, value, sub, color = 'var(--brand-green)' }) {
  return (
    <div className="crm-card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function StageBar({ label, count, total, color }) {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label.replace(/_/g,' ')}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: '5px', background: 'var(--bg-elevated)', borderRadius: '3px' }}>
        <div style={{ height: '5px', width: pct + '%', background: color, borderRadius: '3px', transition: 'width .4s' }} />
      </div>
    </div>
  )
}

export default function ExecutiveDashboard() {
  const { entityView, isCEO, isCOO, isCCO, isKSAClevel, profile } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [entityView])

  async function loadData() {
    setLoading(true)
    try {
      // Base query — filter by entity unless holding
      let q = supabase.from('leads').select('stage, entity, assigned_to')
      if (entityView !== 'holding') q = q.eq('entity', entityView)
      const { data: leads } = await q
      const { data: profiles } = await supabase.from('profiles').select('id,full_name,role')
      setData({ leads: leads ?? [], profiles: profiles ?? [] })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading dashboard…</div>
    </div>
  )

  const leads   = data?.leads ?? []
  const profiles = data?.profiles ?? []
  const total   = leads.length
  const active  = leads.filter(l => ACTIVE_STAGES.includes(l.stage)).length
  const clients = leads.filter(l => CLIENT_STAGES.includes(l.stage)).length
  const lost    = leads.filter(l => l.stage === 'lost').length

  // Stage breakdown
  const stageCounts = {}
  STAGES.forEach(s => { stageCounts[s] = leads.filter(l => l.stage === s).length })

  // Rep performance
  const repIds = [...new Set(leads.map(l => l.assigned_to).filter(Boolean))]
  const repStats = repIds.map(id => {
    const p = profiles.find(p => p.id === id)
    const repLeads = leads.filter(l => l.assigned_to === id)
    return {
      name: p?.full_name ?? 'Unknown',
      total: repLeads.length,
      active: repLeads.filter(l => ACTIVE_STAGES.includes(l.stage)).length,
      clients: repLeads.filter(l => CLIENT_STAGES.includes(l.stage)).length,
    }
  }).sort((a,b) => b.active - a.active)

  // Holding: entity comparison
  const egLeads  = data?.leads.filter(l => l.entity === 'EG')  ?? []
  const ksaLeads = data?.leads.filter(l => l.entity === 'KSA') ?? []

  const viewTitle = entityView === 'holding' ? 'Holding — Both Markets'
    : entityView === 'EG' ? 'Egypt Portfolio'
    : 'KSA Portfolio'

  const roleLabel = isCEO ? 'CEO' : isCOO ? 'COO' : isKSAClevel ? 'KSA C-Level' : 'CCO'

  // Personal rep card for ksa_clevel: their own KSA leads
  const myLeads = isKSAClevel && profile?.id
    ? leads.filter(l => l.assigned_to === profile.id)
    : []

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{viewTitle}</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {roleLabel} view · {entityView === 'holding' ? 'All entities combined' : entityView + ' entity'}
            {isKSAClevel && entityView === 'holding' && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>· read-only</span>}
          </p>
        </div>
      </div>

      {isKSAClevel && myLeads.length > 0 && (
        <div className="crm-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--brand-cyan)' }}>
          <div style={{ fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--brand-cyan)' }}>My Pipeline</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>Personal leads assigned to you</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
            {[
              { l: 'Total',   v: myLeads.length,                                              c: 'var(--text-primary)' },
              { l: 'Active',  v: myLeads.filter(l=>ACTIVE_STAGES.includes(l.stage)).length,  c: 'var(--brand-cyan)' },
              { l: 'Clients', v: myLeads.filter(l=>CLIENT_STAGES.includes(l.stage)).length,  c: '#a78bfa' },
              { l: 'Lost',    v: myLeads.filter(l=>l.stage==='lost').length,                 c: 'var(--danger)' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entityView === 'holding' ? (
        /* ── HOLDING VIEW ── */
        <>
          {/* Cross-market KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            <KpiCard label="Total Leads" value={leads.length} sub="EG + KSA combined" />
            <KpiCard label="Active Pipeline" value={leads.filter(l=>ACTIVE_STAGES.includes(l.stage)).length} sub="In active stages" color="var(--brand-cyan)" />
            <KpiCard label="Total Clients" value={leads.filter(l=>CLIENT_STAGES.includes(l.stage)).length} sub="Active + renewal" color="#a78bfa" />
            <KpiCard label="Lost" value={leads.filter(l=>l.stage==='lost').length} sub="All time" color="var(--danger)" />
          </div>

          {/* EG vs KSA comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="crm-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>EG</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Egypt</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                {[
                  { l: 'Leads', v: egLeads.length },
                  { l: 'Active', v: egLeads.filter(l=>ACTIVE_STAGES.includes(l.stage)).length },
                  { l: 'Clients', v: egLeads.filter(l=>CLIENT_STAGES.includes(l.stage)).length },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-green)' }}>{s.v}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="crm-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>KSA</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>KSA</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                {[
                  { l: 'Leads', v: ksaLeads.length },
                  { l: 'Active', v: ksaLeads.filter(l=>ACTIVE_STAGES.includes(l.stage)).length },
                  { l: 'Clients', v: ksaLeads.filter(l=>CLIENT_STAGES.includes(l.stage)).length },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-cyan)' }}>{s.v}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cross-entity pipeline share */}
          <div className="crm-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Pipeline Distribution — Both Markets</div>
            {STAGES.filter(s => (stageCounts[s] ?? 0) > 0).map(s => (
              <StageBar key={s} label={s} count={stageCounts[s] ?? 0} total={leads.length} color="var(--brand-green)" />
            ))}
          </div>
        </>
      ) : (
        /* ── SINGLE ENTITY VIEW (EG or KSA) ── */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            <KpiCard label="Total Leads"    value={total}   sub={entityView + ' entity'} />
            <KpiCard label="Active Pipeline" value={active}  sub="Meeting → Negotiation" color="var(--brand-cyan)" />
            <KpiCard label="Active Clients"  value={clients} sub="Client active + renewal" color="#a78bfa" />
            <KpiCard label="Lost"            value={lost}    sub="Closed lost" color="var(--danger)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Stage breakdown */}
            <div className="crm-card" style={{ padding: '20px' }}>
              <div style={{ fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Pipeline by Stage</div>
              {STAGES.filter(s => (stageCounts[s] ?? 0) > 0).map(s => (
                <StageBar key={s} label={s} count={stageCounts[s] ?? 0} total={total} color="var(--brand-green)" />
              ))}
              {total === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No leads in this entity yet.</div>}
            </div>

            {/* Rep performance */}
            <div className="crm-card" style={{ padding: '20px' }}>
              <div style={{ fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Team Performance</div>
              {repStats.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No reps with leads yet.</div>}
              {repStats.map(r => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {r.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', truncate: true }}>{r.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.total} leads · {r.active} active · {r.clients} clients</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-cyan)' }}>{r.active}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
