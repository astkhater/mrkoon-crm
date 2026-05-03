import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, AlertTriangle, RefreshCw } from 'lucide-react'
import { supabase }      from '@/lib/supabase'
import { useAuth }       from '@/contexts/AuthContext'
import { useApp }        from '@/contexts/AppContext'
import { formatEGP, formatDate } from '@/lib/i18n'
import TopBar            from '@/components/layout/TopBar'
import LeadPanel         from '@/components/pipeline/LeadPanel'

const CLIENT_STAGES = ['client_active', 'client_inactive', 'client_renewal']
const STAGE_COLORS  = { client_active: '#22c55e', client_inactive: '#ef4444', client_renewal: '#f59e0b' }
const CONTRACT_TYPES = ['yearly','quarterly','monthly','yearly_on_demand','per_item']

async function fetchAccounts(userId, isManager) {
  let q = supabase.from('leads').select(`
    id, company_name, company_id, stage, entity, is_sna,
    contact_name, contact_title, phone, estimated_gmv_month,
    next_action, next_action_date, date_added, assigned_to,
    profiles:assigned_to ( full_name ),
    accounts!accounts_lead_id_fkey (
      id, contract_type, contract_start_date, contract_end_date, gmv_target, gmv_realized
    )
  `).in('stage', CLIENT_STAGES).order('company_name', { ascending: true })
  if (!isManager) q = q.eq('assigned_to', userId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(row => ({
    ...row,
    contract_type:       row.accounts?.contract_type       ?? null,
    contract_start_date: row.accounts?.contract_start_date ?? null,
    contract_end_date:   row.accounts?.contract_end_date   ?? null,
    gmv_target:          row.accounts?.gmv_target          ?? null,
    gmv_realized:        row.accounts?.gmv_realized        ?? null,
  }))
}

async function fetchReps() {
  const { data, error } = await supabase.from('profiles').select('id, full_name').in('role', ['bd_rep','am','tl']).order('full_name')
  if (error) throw error
  return data ?? []
}

export default function Accounts() {
  const { userId, isManager }               = useAuth()
  const { t, lang, repFilter, setRepFilter } = useApp()
  const [search,         setSearch]         = useState('')
  const [stageFilter,    setStageFilter]    = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [entityFilter,   setEntityFilter]   = useState('')
  const [selectedLead,   setSelectedLead]   = useState(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', userId, isManager],
    queryFn:  () => fetchAccounts(userId, isManager),
    staleTime: 30_000,
  })
  const { data: reps = [] } = useQuery({
    queryKey: ['pipeline-reps'], queryFn: fetchReps,
    enabled: isManager, staleTime: 120_000,
  })

  const kpis = useMemo(() => {
    const active   = accounts.filter(a => a.stage === 'client_active').length
    const inactive = accounts.filter(a => a.stage === 'client_inactive').length
    const renewal  = accounts.filter(a => a.stage === 'client_renewal').length
    const sna      = accounts.filter(a => a.is_sna).length
    const totalGMV = accounts.reduce((s, a) => s + (a.gmv_target ?? a.estimated_gmv_month ?? 0), 0)
    return { active, inactive, renewal, sna, totalGMV, total: accounts.length }
  }, [accounts])

  const filtered = useMemo(() => {
    let rows = accounts
    if (search)         rows = rows.filter(a => a.company_name.toLowerCase().includes(search.toLowerCase()))
    if (stageFilter)    rows = rows.filter(a => a.stage === stageFilter)
    if (contractFilter) rows = rows.filter(a => a.contract_type === contractFilter)
    if (repFilter)      rows = rows.filter(a => a.assigned_to === repFilter)
    if (entityFilter)   rows = rows.filter(a => a.entity === entityFilter)
    return rows
  }, [accounts, search, stageFilter, contractFilter, repFilter, entityFilter])

  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="crm-input" style={{ paddingLeft: '28px', width: '200px', fontSize: '12px' }} placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <select className="crm-input" style={{ fontSize: '12px', width: '130px' }} value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
        <option value="">All statuses</option>
        {CLIENT_STAGES.map(s => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
      </select>
      <select className="crm-input" style={{ fontSize: '12px', width: '130px' }} value={contractFilter} onChange={e => setContractFilter(e.target.value)}>
        <option value="">All contracts</option>
        {CONTRACT_TYPES.map(c => <option key={c} value={c}>{t(`contract.${c}`)}</option>)}
      </select>
      <select className="crm-input" style={{ fontSize: '12px', width: '90px' }} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
        <option value="">All</option><option value="EG">Egypt</option><option value="KSA">KSA</option>
      </select>
      {isManager && (
        <select className="crm-input" style={{ fontSize: '12px', width: '140px' }} value={repFilter}
          onChange={e => {
            const rep = reps.find(r => r.id === e.target.value)
            setRepFilter(e.target.value, rep?.full_name || '')
          }}>
          <option value="">All reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title={t('nav.accounts')} actions={actions} />
      {!isLoading && (
        <div style={{ display: 'flex', gap: '1px', borderBottom: '1px solid var(--border-default)', background: 'var(--border-default)', flexShrink: 0 }}>
          {[
            { label: 'Active',    value: kpis.active,   color: '#22c55e' },
            { label: 'Inactive',  value: kpis.inactive, color: '#ef4444' },
            { label: 'Renewal',   value: kpis.renewal,  color: '#f59e0b' },
            { label: 'SNA',       value: kpis.sna,      color: '#ef4444' },
            { label: 'Total GMV', value: formatEGP(kpis.totalGMV), color: 'var(--brand-green)', wide: true },
          ].map(k => (
            <div key={k.label} style={{ flex: k.wide ? 2 : 1, padding: '10px 16px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '6px 18px', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)', flexShrink: 0 }}>
        {isLoading ? t('misc.loading') : `${filtered.length} account${filtered.length !== 1 ? 's' : ''}`}
        {filtered.length !== accounts.length && <span style={{ marginLeft: '6px', color: 'var(--brand-cyan)' }}>(filtered from {accounts.length})</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('misc.loading')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('misc.empty')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Company','Status','Contract','Contact','GMV / mo','Next Action', isManager ? 'Rep' : null,'Entity'].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'GMV / mo' ? 'right' : 'left', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(account => (
                <AccountRow key={account.id} account={account} isManager={isManager} lang={lang} t={t} onClick={() => setSelectedLead(account)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedLead && <LeadPanel leadId={selectedLead.id} onClose={() => setSelectedLead(null)} />}
    </div>
  )
}

function AccountRow({ account, isManager, lang, t, onClick }) {
  const stageColor = STAGE_COLORS[account.stage] ?? '#64748b'
  const isRenewal  = account.stage === 'client_renewal'
  const isOverdue  = account.next_action_date && new Date(account.next_action_date) < new Date()
  return (
    <tr onClick={onClick} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-default)', background: isRenewal ? 'rgba(245,158,11,0.04)' : 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = isRenewal ? 'rgba(245,158,11,0.04)' : 'transparent'}>
      <td style={{ padding: '9px 12px', maxWidth: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {account.is_sna && <AlertTriangle size={11} color="#ef4444" style={{ flexShrink: 0 }} />}
          {isRenewal && <RefreshCw size={11} color="#f59e0b" style={{ flexShrink: 0 }} />}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.company_name}</span>
        </div>
      </td>
      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: `${stageColor}22`, color: stageColor }}>{t(`stage.${account.stage}`)}</span>
      </td>
      <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{account.contract_type ? t(`contract.${account.contract_type}`) : '-'}</td>
      <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', maxWidth: '160px' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.contact_name ?? '-'}</div>
        {account.contact_title && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.contact_title}</div>}
      </td>
      <td style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {(account.gmv_target ?? account.estimated_gmv_month) ? (
          <div>
            <div style={{ color: 'var(--brand-green)', fontWeight: 700 }}>{formatEGP(account.gmv_target ?? account.estimated_gmv_month)}</div>
            {account.gmv_realized != null && account.gmv_realized > 0 && <div style={{ fontSize: '10px', color: 'var(--brand-cyan)', marginTop: '1px' }}>{formatEGP(account.gmv_realized)} realized</div>}
          </div>
        ) : '-'}
      </td>
      <td style={{ padding: '9px 12px', maxWidth: '200px' }}>
        {account.next_action_date ? (
          <div>
            <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(account.next_action_date, lang)}</span>
            {account.next_action && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{account.next_action}</div>}
          </div>
        ) : '-'}
      </td>
      {isManager && <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{account.profiles?.full_name ?? '-'}</td>}
      <td style={{ padding: '9px 12px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
          background: account.entity === 'KSA' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
          color: account.entity === 'KSA' ? '#22c55e' : '#3b82f6' }}>{account.entity}</span>
      </td>
    </tr>
  )
}
