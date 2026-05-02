import { useState, useMemo } from 'react'
import { useQuery }          from '@tanstack/react-query'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase }     from '@/lib/supabase'
import { useAuth }      from '@/contexts/AuthContext'
import { useApp }       from '@/contexts/AppContext'
import { formatEGP }    from '@/lib/i18n'
import TopBar           from '@/components/layout/TopBar'
import LeadCard         from '@/components/pipeline/LeadCard'
import LeadPanel        from '@/components/pipeline/LeadPanel'
import AddLeadModal     from '@/components/pipeline/AddLeadModal'

const ACTIVE_STAGES = [
  { key: 'new_lead',        color: '#64748b' },
  { key: 'reaching_out',    color: '#3b82f6' },
  { key: 'no_response',     color: '#6366f1' },
  { key: 'meeting_done',    color: '#8b5cf6' },
  { key: 'negotiation',     color: '#f59e0b' },
  { key: 'prospect_active', color: '#22c55e' },
  { key: 'prospect_cold',   color: '#94a3b8' },
  { key: 'reconnect',       color: '#f97316' },
]

const GRAVEYARD_STAGES = [
  { key: 'lost',        color: '#ef4444' },
  { key: 'unqualified', color: '#475569' },
]

async function fetchPipelineLeads(userId, isManager, repFilter) {
  let q = supabase
    .from('leads')
    .select(`
      id, company_name, company_id, stage, entity,
      lead_source, is_sna,
      estimated_gmv_month, deal_success_rate,
      next_action, next_action_date,
      assigned_to,
      profiles:assigned_to ( full_name )
    `)
    .not('stage', 'in', '(client_active,client_inactive,client_renewal)')
    .order('date_added', { ascending: false })

  if (!isManager) q = q.eq('assigned_to', userId)
  else if (repFilter) q = q.eq('assigned_to', repFilter)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

async function fetchReps() {
  const { data, error } = await supabase
    .from('profiles').select('id, full_name').in('role', ['bd_rep', 'am', 'tl']).order('full_name')
  if (error) throw error
  return data ?? []
}

export default function Pipeline() {
  const { userId, isManager } = useAuth()
  const { t }                  = useApp()
  const [repFilter,     setRepFilter]     = useState('')
  const [selectedLead,  setSelectedLead]  = useState(null)
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [graveyardOpen, setGraveyardOpen] = useState(false)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['pipeline-leads', userId, isManager, repFilter],
    queryFn:  () => fetchPipelineLeads(userId, isManager, repFilter),
    staleTime: 30000,
  })

  const { data: reps = [] } = useQuery({
    queryKey: ['pipeline-reps'],
    queryFn:  fetchReps,
    enabled:  isManager,
    staleTime: 120000,
  })

  const byStage = useMemo(() => {
    const map = {}
    for (const lead of leads) {
      if (!map[lead.stage]) map[lead.stage] = []
      map[lead.stage].push(lead)
    }
    return map
  }, [leads])

  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {isManager && (
        <select className="crm-input" style={{ width: '160px', padding: '5px 10px', fontSize: '12px' }}
          value={repFilter} onChange={e => setRepFilter(e.target.value)}>
          <option value="">All reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
      )}
      <button className="btn btn-primary btn-sm"
        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        onClick={() => setShowAddModal(true)}>
        <Plus size={14} />
        {t('bd.add_lead')}
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title={t('nav.pipeline')} actions={actions} />
      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: '14px' }}>
          {t('misc.loading')}
        </div>
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '0 16px 16px' }}>
          <div style={{
            display: 'flex', gap: '10px',
            minWidth: `${ACTIVE_STAGES.length * 220}px`,
            paddingTop: '16px', height: '100%',
          }}>
            {ACTIVE_STAGES.map(({ key, color }) => (
              <KanbanColumn key={key} stageKey={key} color={color}
                leads={byStage[key] ?? []} label={t(`stage.${key}`)} onCardClick={setSelectedLead} />
            ))}
          </div>
          <div style={{ marginTop: '14px' }}>
            <button className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '5px',
                color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}
              onClick={() => setGraveyardOpen(o => !o)}>
              {graveyardOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              Graveyard
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--bg-hover)',
                color: 'var(--text-muted)', padding: '1px 6px', borderRadius: '20px', marginLeft: '3px' }}>
                {GRAVEYARD_STAGES.reduce((n, s) => n + (byStage[s.key]?.length ?? 0), 0)}
              </span>
            </button>
            {graveyardOpen && (
              <div style={{ display: 'flex', gap: '10px', minWidth: `${GRAVEYARD_STAGES.length * 220}px` }}>
                {GRAVEYARD_STAGES.map(({ key, color }) => (
                  <KanbanColumn key={key} stageKey={key} color={color}
                    leads={byStage[key] ?? []} label={t(`stage.${key}`)} onCardClick={setSelectedLead} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {selectedLead && <LeadPanel leadId={selectedLead.id} onClose={() => setSelectedLead(null)} />}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onCreated={lead => setSelectedLead(lead)} />}
    </div>
  )
}

function KanbanColumn({ stageKey, color, leads, label, onCardClick }) {
  const totalGMV = leads.reduce((sum, l) => sum + (l.estimated_gmv_month ?? 0), 0)
  return (
    <div style={{ width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '8px 10px', borderRadius: '7px 7px 0 0',
        borderTop: `3px solid ${color}`,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-default)',
        borderRight: '1px solid var(--border-default)',
        marginBottom: '1px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color,
            background: `${color}22`, padding: '1px 6px', borderRadius: '20px' }}>
            {leads.length}
          </span>
        </div>
        {totalGMV > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatEGP(totalGMV)}</div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px', background: 'var(--bg-hover)',
        border: '1px solid var(--border-default)', borderTop: 'none', borderRadius: '0 0 7px 7px',
        display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '11px', color: 'var(--text-muted)' }}>—</div>
        ) : leads.map(lead => <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />)}
      </div>
    </div>
  )
}