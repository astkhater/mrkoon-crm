/**
 * Leads — searchable, filterable table of all pipeline leads
 * CCO/TL: see all reps + rep filter
 * BD Rep: own leads only
 * Row click opens LeadPanel slide-in
 */
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, AlertTriangle, Calendar, ChevronUp, ChevronDown, CheckSquare, Square, Tag, X } from 'lucide-react'
import { supabase }     from '@/lib/supabase'
import { useAuth }      from '@/contexts/AuthContext'
import { useApp }       from '@/contexts/AppContext'
import { formatDate, formatEGP } from '@/lib/i18n'
import TopBar           from '@/components/layout/TopBar'
import LeadPanel        from '@/components/pipeline/LeadPanel'

const ALL_STAGES = [
  'new_lead', 'reaching_out', 'no_response', 'meeting_done',
  'negotiation', 'prospect_active', 'prospect_cold', 'reconnect',
  'client_active', 'client_inactive', 'client_renewal',
  'lost', 'unqualified',
]

const SOURCES = [
  'campaign', 'referral', 'cold_outreach', 'whatsapp',
  'platform_app', 'exhibition', 'linkedin', 'facebook_instagram',
]

const STAGE_COLORS = {
  new_lead: '#64748b', reaching_out: '#3b82f6', no_response: '#6366f1',
  meeting_done: '#8b5cf6', negotiation: '#f59e0b',
  prospect_active: '#22c55e', prospect_cold: '#94a3b8',
  reconnect: '#f97316', client_active: '#22c55e',
  client_inactive: '#ef4444', client_renewal: '#f59e0b',
  lost: '#ef4444', unqualified: '#475569',
}

async function fetchLeads(userId, isManager) {
  let q = supabase
    .from('leads')
    .select(`
      id, company_name, stage, entity, lead_source, is_sna,
      contact_name, contact_title, phone,
      estimated_gmv_month, deal_success_rate, deal_value,
      next_action, next_action_date,
      date_added, assigned_to,
      profiles:assigned_to ( full_name )
    `)
    .order('date_added', { ascending: false })

  if (!isManager) q = q.eq('assigned_to', userId)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

async function fetchReps() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['bd_rep', 'am', 'tl'])
    .order('full_name')
  if (error) throw error
  return data ?? []
}

function sortLeads(leads, key, dir) {
  if (!key) return leads
  return [...leads].sort((a, b) => {
    let av = a[key], bv = b[key]
    if (key === 'profiles') { av = a.profiles?.full_name ?? ''; bv = b.profiles?.full_name ?? '' }
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
    return dir === 'asc' ? cmp : -cmp
  })
}

export default function Leads() {
  const { userId, isManager } = useAuth()
  const { t, lang }           = useApp()
  const queryClient           = useQueryClient()

  const [search,        setSearch]        = useState('')
  const [stageFilter,   setStageFilter]   = useState('')
  const [sourceFilter,  setSourceFilter]  = useState('')
  const [repFilter,     setRepFilter]     = useState('')
  const [entityFilter,  setEntityFilter]  = useState('')
  const [selectedLead,  setSelectedLead]  = useState(null)
  const [sortKey,       setSortKey]       = useState('date_added')
  const [sortDir,       setSortDir]       = useState('desc')
  const [selected,      setSelected]      = useState(new Set())
  const [bulkStage,     setBulkStage]     = useState('')
  const [bulkSaving,    setBulkSaving]    = useState(false)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['all-leads', userId, isManager],
    queryFn:  () => fetchLeads(userId, isManager),
    staleTime: 30_000,
  })

  const { data: reps = [] } = useQuery({
    queryKey: ['pipeline-reps'],
    queryFn:  fetchReps,
    enabled:  isManager,
    staleTime: 120_000,
  })

  const filtered = useMemo(() => {
    let rows = leads
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(l =>
        l.company_name?.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
      )
    }
    if (stageFilter)  rows = rows.filter(l => l.stage === stageFilter)
    if (sourceFilter) rows = rows.filter(l => l.lead_source === sourceFilter)
    if (repFilter)    rows = rows.filter(l => l.assigned_to === repFilter)
    if (entityFilter) rows = rows.filter(l => l.entity === entityFilter)
    return sortLeads(rows, sortKey, sortDir)
  }, [leads, search, stageFilter, sourceFilter, repFilter, entityFilter, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(l => l.id)))
  }

  async function applyBulkStage() {
    if (!bulkStage || selected.size === 0) return
    setBulkSaving(true)
    await supabase.from('leads').update({ stage: bulkStage }).in('id', [...selected])
    queryClient.invalidateQueries({ queryKey: ['all-leads'] })
    queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] })
    setSelected(new Set())
    setBulkStage('')
    setBulkSaving(false)
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
  }

  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          className="crm-input"
          style={{ paddingLeft: '28px', width: '200px', fontSize: '12px' }}
          placeholder={t('misc.search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <select className="crm-input" style={{ fontSize: '12px', width: '140px' }}
        value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
        <option value="">All stages</option>
        {ALL_STAGES.map(s => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
      </select>

      <select className="crm-input" style={{ fontSize: '12px', width: '130px' }}
        value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
        <option value="">All sources</option>
        {SOURCES.map(s => <option key={s} value={s}>{t(`source.${s}`)}</option>)}
      </select>

      <select className="crm-input" style={{ fontSize: '12px', width: '90px' }}
        value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
        <option value="">All</option>
        <option value="EG">Egypt</option>
        <option value="KSA">KSA</option>
      </select>

      {isManager && (
        <select className="crm-input" style={{ fontSize: '12px', width: '140px' }}
          value={repFilter} onChange={e => setRepFilter(e.target.value)}>
          <option value="">All reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title={t('nav.leads')} actions={actions} />

      <div style={{
        padding: '6px 18px', fontSize: '12px', color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        {isLoading ? t('misc.loading') : (
          <span>
            {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== leads.length && (
              <span style={{ marginLeft: '6px', color: 'var(--brand-cyan)' }}>
                (filtered from {leads.length})
              </span>
            )}
          </span>
        )}
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>{selected.size} selected</span>
            <select
              value={bulkStage}
              onChange={e => setBulkStage(e.target.value)}
              className="crm-input"
              style={{ fontSize: '11px', padding: '3px 7px', height: '26px' }}
            >
              <option value="">Move to stage…</option>
              {ALL_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <button
              onClick={applyBulkStage}
              disabled={!bulkStage || bulkSaving}
              className="btn btn-primary btn-xs"
            >
              {bulkSaving ? 'Saving…' : 'Apply'}
            </button>
            <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-xs">
              <X size={11} /> Clear
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            {t('misc.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            {t('misc.empty')}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '8px 4px 8px 14px', borderBottom: '1px solid var(--border-default)', width: '32px' }}>
                  <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {selected.size > 0 && selected.size === filtered.length
                      ? <CheckSquare size={14} style={{ color: 'var(--brand-green)' }} />
                      : <Square size={14} />
                    }
                  </button>
                </th>
                <Th onClick={() => toggleSort('company_name')}>Company <SortIcon col="company_name" /></Th>
                <Th onClick={() => toggleSort('stage')}>Stage <SortIcon col="stage" /></Th>
                <Th>Source</Th>
                <Th>Contact</Th>
                <Th onClick={() => toggleSort('estimated_gmv_month')} align="right">GMV / mo <SortIcon col="estimated_gmv_month" /></Th>
                <Th align="right">Prob.</Th>
                <Th onClick={() => toggleSort('next_action_date')}>Next action <SortIcon col="next_action_date" /></Th>
                {isManager && <Th onClick={() => toggleSort('profiles')}>Rep <SortIcon col="profiles" /></Th>}
                <Th>Entity</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  isManager={isManager}
                  lang={lang}
                  t={t}
                  isSelected={selected.has(lead.id)}
                  onSelect={e => { e.stopPropagation(); toggleSelect(lead.id) }}
                  onClick={() => setSelectedLead(lead)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedLead && (
        <LeadPanel leadId={selectedLead.id} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  )
}

function Th({ children, onClick, align = 'left' }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '8px 12px',
        textAlign: align,
        fontWeight: 600, fontSize: '11px',
        color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
        borderBottom: '1px solid var(--border-default)',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        {children}
      </span>
    </th>
  )
}

function LeadRow({ lead, isManager, lang, t, onClick, isSelected, onSelect }) {
  const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date()
  const stageColor = STAGE_COLORS[lead.stage] ?? '#64748b'
  const weighted = lead.estimated_gmv_month && lead.deal_success_rate != null
    ? Math.round(lead.estimated_gmv_month * lead.deal_success_rate / 100)
    : null

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-default)', background: isSelected ? 'rgba(34,197,94,0.05)' : 'transparent' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <td style={{ padding: '9px 4px 9px 14px', width: '32px' }} onClick={onSelect}>
        {isSelected
          ? <CheckSquare size={14} style={{ color: 'var(--brand-green)', display: 'block' }} />
          : <Square size={14} style={{ color: 'var(--text-muted)', display: 'block', opacity: 0.4 }} />
        }
      </td>

      <td style={{ padding: '9px 12px', maxWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {lead.is_sna && <AlertTriangle size={11} color="#ef4444" style={{ flexShrink: 0 }} />}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.company_name}
          </span>
        </div>
      </td>

      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px',
          background: `${stageColor}22`, color: stageColor,
        }}>
          {t(`stage.${lead.stage}`)}
        </span>
      </td>

      <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {lead.lead_source && lead.lead_source !== 'unknown' ? t(`source.${lead.lead_source}`) : '—'}
      </td>

      <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', maxWidth: '160px' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.contact_name ?? '—'}
        </div>
        {lead.contact_title && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.contact_title}
          </div>
        )}
      </td>

      <td style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {lead.estimated_gmv_month ? (
          <div>
            <div style={{ color: 'var(--brand-green)', fontWeight: 700 }}>
              {formatEGP(lead.estimated_gmv_month)}
            </div>
            {weighted && (
              <div style={{ fontSize: '10px', color: 'var(--brand-cyan)', marginTop: '1px' }}>
                {formatEGP(weighted)}
              </div>
            )}
          </div>
        ) : '—'}
      </td>

      <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {lead.deal_success_rate != null ? `${lead.deal_success_rate}%` : '—'}
      </td>

      <td style={{ padding: '9px 12px', maxWidth: '180px' }}>
        {lead.next_action_date ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={10} color={isOverdue ? '#ef4444' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
            <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {formatDate(lead.next_action_date, lang)}
            </span>
            {lead.next_action && (
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                — {lead.next_action}
              </span>
            )}
          </div>
        ) : '—'}
      </td>

      {isManager && (
        <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {lead.profiles?.full_name ?? '—'}
        </td>
      )}

      <td style={{ padding: '9px 12px' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
          background: lead.entity === 'KSA' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
          color: lead.entity === 'KSA' ? '#22c55e' : '#3b82f6',
        }}>
          {lead.entity}
        </span>
      </td>
    </tr>
  )
}