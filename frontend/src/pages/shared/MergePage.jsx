/**
 * MergePage — Detect and merge duplicate company leads
 * Auto-detects duplicates by fuzzy company name match.
 * Manual search lets any user pick two leads to compare side-by-side.
 */
import { useState, useMemo, useEffect } from 'react'
import { GitMerge, Search, Check, X, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'
import TopBar        from '@/components/layout/TopBar'

// ── Normalizer ────────────────────────────────────────────────
function norm(s) {
  if (!s) return ''
  return String(s).toLowerCase().trim()
    .replace(/[.,،؛;:\-_'"()]/g, '')
    .replace(/\s+/g, ' ')
}

// ── Fields to compare ─────────────────────────────────────────
const FIELDS = [
  { key: 'company_name',        label: 'Company Name' },
  { key: 'stage',               label: 'Stage' },
  { key: 'lead_source',         label: 'Source' },
  { key: 'contact_name',        label: 'Contact Name',   mergeable: true },
  { key: 'contact_title',       label: 'Job Title',      mergeable: true },
  { key: 'phone',               label: 'Phone',          mergeable: true },
  { key: 'email',               label: 'Email',          mergeable: true },
  { key: 'estimated_gmv_month', label: 'GMV / Mo' },
  { key: 'deal_success_rate',   label: 'Success Rate %' },
  { key: 'deal_value',          label: 'Deal Value' },
  { key: 'next_action',         label: 'Next Action',    mergeable: true },
  { key: 'next_action_date',    label: 'Action Date' },
]

// ── Helpers ───────────────────────────────────────────────────
function fmt(val) {
  if (val == null || val === '') return null
  return String(val)
}

// ── Sub-components ────────────────────────────────────────────
function LeadPicker({ label, search, setSearch, results, selected, onSelect, disabled }) {
  return (
    <div className="crm-card" style={{ padding: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </div>
      {selected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>{selected.company_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {selected.entity} · {selected.stage?.replace(/_/g, ' ')} · {selected.profiles?.full_name ?? '—'}
            </div>
          </div>
          <button onClick={() => onSelect(null)} className="btn btn-ghost btn-icon"><X size={14} /></button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            className="crm-input"
            placeholder="Search company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={disabled}
            style={{ width: '100%' }}
          />
          {results.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '8px', marginTop: '4px', maxHeight: '220px', overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              {results.map(l => (
                <div
                  key={l.id}
                  onClick={() => { onSelect(l); setSearch('') }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{l.company_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {l.entity} · {l.stage?.replace(/_/g, ' ')} · {l.profiles?.full_name ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryCard({ title, items, color, note }) {
  return (
    <div className="crm-card">
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color }}>{title}</div>
        {note && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{note}</div>}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>No activity recorded</div>
      ) : (
        items.slice(0, 10).map((h, i) => (
          <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
            <div style={{ color: 'var(--text-primary)' }}>{h.summary}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
              {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function CompareView({ leadA, leadB, historyA, historyB, choices, setChoices, onMerge, onBack, onSkip, merging, swapAB }) {
  const diffFields = FIELDS.filter(f =>
    norm(fmt(leadA[f.key]) ?? '') !== norm(fmt(leadB[f.key]) ?? '') &&
    (leadA[f.key] != null || leadB[f.key] != null)
  )
  const sameFields = FIELDS.filter(f =>
    norm(fmt(leadA[f.key]) ?? '') === norm(fmt(leadB[f.key]) ?? '') &&
    (leadA[f.key] || leadB[f.key])
  )

  return (
    <div className="page-content">
      <TopBar title="Compare & Merge" />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <button className="btn btn-ghost btn-sm" onClick={swapAB} title="Swap A and B">⇄ Swap A/B</button>
        <div style={{ flex: 1 }} />
        {onSkip && (
          <button className="btn btn-ghost btn-sm" onClick={onSkip} style={{ color: 'var(--text-muted)' }}>
            Not duplicates — keep both
          </button>
        )}
        <button className="btn btn-primary btn-md" onClick={onMerge} disabled={merging}>
          <GitMerge size={14} />
          {merging ? 'Merging...' : 'Confirm Merge'}
        </button>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
        <div />
        <div className="crm-card" style={{
          padding: '10px 16px', textAlign: 'center',
          background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.3)',
        }}>
          <div style={{ fontWeight: 800, fontSize: '11px', color: 'var(--brand-cyan)', letterSpacing: '.06em' }}>KEEP (A)</div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{leadA.company_name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{leadA.entity} · {leadA.stage?.replace(/_/g,' ')}</div>
        </div>
        <div className="crm-card" style={{
          padding: '10px 16px', textAlign: 'center',
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <div style={{ fontWeight: 800, fontSize: '11px', color: '#f87171', letterSpacing: '.06em' }}>MERGE IN → DROP (B)</div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{leadB.company_name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{leadB.entity} · {leadB.stage?.replace(/_/g,' ')}</div>
        </div>
      </div>

      {/* Conflicting fields */}
      {diffFields.length > 0 && (
        <div className="crm-card" style={{ marginBottom: '12px' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            fontSize: '11px', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '.06em',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <AlertTriangle size={13} /> Conflicting fields — click a value to keep it
          </div>
          {diffFields.map(f => {
            const valA = leadA[f.key]
            const valB = leadB[f.key]
            const choice = choices[f.key]
            const bothVal = [valA, valB].filter(Boolean).join(' · ')
            return (
              <div key={f.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', minHeight: '44px' }}>
                  <div style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {f.label}
                  </div>
                  {['a', 'b'].map(side => {
                    const val = (side === 'a' ? valA : valB)
                    const chosen = choice === side
                    return (
                      <div
                        key={side}
                        onClick={() => setChoices(c => ({ ...c, [f.key]: side }))}
                        style={{
                          padding: '10px 16px', cursor: 'pointer',
                          background: chosen ? (side === 'a' ? 'rgba(34,211,238,0.08)' : 'rgba(34,197,94,0.08)') : 'transparent',
                          borderLeft: chosen ? `2px solid ${side === 'a' ? 'var(--brand-cyan)' : 'var(--brand-green)'}` : '2px solid transparent',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          fontSize: '13px', transition: 'background 0.15s',
                        }}
                      >
                        {chosen && <Check size={12} style={{ color: side === 'a' ? 'var(--brand-cyan)' : 'var(--brand-green)', flexShrink: 0 }} />}
                        {val != null && val !== ''
                          ? <span style={{ color: 'var(--text-primary)' }}>{String(val)}</span>
                          : <em style={{ color: 'var(--text-muted)', opacity: 0.5 }}>empty</em>}
                      </div>
                    )
                  })}
                </div>
                {/* "Keep both" row for mergeable fields */}
                {f.mergeable && valA && valB && (
                  <div
                    onClick={() => setChoices(c => ({ ...c, [f.key]: 'both' }))}
                    style={{
                      padding: '7px 16px 7px 176px', cursor: 'pointer',
                      background: choice === 'both' ? 'rgba(168,85,247,0.08)' : 'var(--bg-elevated)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontSize: '12px', transition: 'background 0.15s',
                    }}
                  >
                    {choice === 'both'
                      ? <Check size={11} style={{ color: '#c084fc', flexShrink: 0 }} />
                      : <span style={{ width: 11, flexShrink: 0 }} />}
                    <span style={{ color: '#c084fc', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>Keep both →</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{bothVal}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Matching fields */}
      {sameFields.length > 0 && (
        <div className="crm-card" style={{ marginBottom: '12px' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            fontSize: '11px', fontWeight: 700, color: 'var(--brand-green)', textTransform: 'uppercase', letterSpacing: '.06em',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Check size={13} /> Matching fields — no conflict
          </div>
          {sameFields.map(f => (
            <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {f.label}
              </div>
              <div style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={11} style={{ color: 'var(--brand-green)', flexShrink: 0 }} />
                {String(leadA[f.key] ?? '')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity history */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
        <HistoryCard
          title={`${leadA.company_name} — Activity`}
          items={historyA}
          color="var(--brand-cyan)"
        />
        <HistoryCard
          title={`${leadB.company_name} — Activity`}
          items={historyB}
          color="#f87171"
          note="Will be reassigned to the kept record after merge"
        />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function MergePage() {
  const { entityFilter } = useAuth()
  const { toast }        = useApp()

  const [tab,        setTab]        = useState('detect')
  const [expanded,   setExpanded]   = useState({})
  const [dismissed,  setDismissed]  = useState({})
  const [allLeads, setAllLeads] = useState([])
  const [loading,  setLoading]  = useState(true)

  // Manual search
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [leadA,   setLeadA]   = useState(null)
  const [leadB,   setLeadB]   = useState(null)

  // Compare / merge state
  const [comparing, setComparing] = useState(false)
  const [historyA,  setHistoryA]  = useState([])
  const [historyB,  setHistoryB]  = useState([])
  const [choices,   setChoices]   = useState({})
  const [merging,   setMerging]   = useState(false)
  const [merged,    setMerged]    = useState(false)

  useEffect(() => { loadLeads() }, [entityFilter])

  async function loadLeads() {
    setLoading(true)
    let q = supabase.from('leads').select(`
      id, company_name, stage, entity, lead_source,
      contact_name, contact_title, phone,
      estimated_gmv_month, deal_success_rate, deal_value,
      next_action, next_action_date, date_added, assigned_to,
      profiles:assigned_to ( full_name )
    `)
    if (entityFilter) q = q.eq('entity', entityFilter)
    const { data } = await q
    setAllLeads(data ?? [])
    setLoading(false)
  }

  // Auto-detected duplicate groups
  const dupGroups = useMemo(() => {
    const groups = {}
    for (const lead of allLeads) {
      const key = norm(lead.company_name) + '||' + lead.entity
      if (!groups[key]) groups[key] = []
      groups[key].push(lead)
    }
    return Object.values(groups)
      .filter(g => g.length > 1)
      .sort((a, b) => b.length - a.length)
  }, [allLeads])

  // Search results
  const resultsA = useMemo(() => {
    if (!searchA.trim()) return []
    const q = norm(searchA)
    return allLeads.filter(l => norm(l.company_name).includes(q)).slice(0, 8)
  }, [allLeads, searchA])

  const resultsB = useMemo(() => {
    if (!searchB.trim()) return []
    const q = norm(searchB)
    return allLeads.filter(l => norm(l.company_name).includes(q) && l.id !== leadA?.id).slice(0, 8)
  }, [allLeads, searchB, leadA])

  async function startCompare(a, b) {
    // Default: prefer non-null values, A wins ties
    const defaults = {}
    for (const f of FIELDS) {
      defaults[f.key] = (!a[f.key] && b[f.key]) ? 'b' : 'a'
    }
    setChoices(defaults)
    setLeadA(a)
    setLeadB(b)

    // Load audit history for both
    const [{ data: ha }, { data: hb }] = await Promise.all([
      supabase.from('audit_log')
        .select('action, summary, created_at')
        .eq('entity_id', a.id).eq('entity_type', 'lead')
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('audit_log')
        .select('action, summary, created_at')
        .eq('entity_id', b.id).eq('entity_type', 'lead')
        .order('created_at', { ascending: false }).limit(20),
    ])
    setHistoryA(ha ?? [])
    setHistoryB(hb ?? [])
    setComparing(true)
  }

  async function executeMerge() {
    setMerging(true)
    // Build merged data from choices
    const mergedData = {}
    for (const f of FIELDS) {
      if (choices[f.key] === 'both') {
        const a = leadA[f.key], b = leadB[f.key]
        mergedData[f.key] = [a, b].filter(Boolean).join(' · ')
      } else {
        mergedData[f.key] = (choices[f.key] === 'b' ? leadB : leadA)[f.key] ?? null
      }
    }

    try {
      const { error } = await supabase.rpc('merge_leads', {
        keep_id:     leadA.id,
        drop_id:     leadB.id,
        merged_data: mergedData,
      })
      if (error) throw error
      toast({ type: 'success', message: `Merged "${leadB.company_name}" into "${leadA.company_name}"` })
      setMerged(true)
      loadLeads()
    } catch (e) {
      toast({ type: 'error', message: e.message ?? 'Merge failed' })
    }
    setMerging(false)
  }

  function reset() {
    setComparing(false); setMerged(false)
    setLeadA(null); setLeadB(null)
    setSearchA(''); setSearchB('')
    setHistoryA([]); setHistoryB([])
  }

  // ── Render: compare view ──────────────────────────────────
  if (comparing && !merged) {
    return (
      <CompareView
        leadA={leadA} leadB={leadB}
        historyA={historyA} historyB={historyB}
        choices={choices} setChoices={setChoices}
        onMerge={executeMerge} onBack={reset}
        onSkip={reset}
        merging={merging}
        swapAB={() => { setLeadA(leadB); setLeadB(leadA) }}
      />
    )
  }

  // ── Render: done ──────────────────────────────────────────
  if (merged) {
    return (
      <div className="page-content">
        <TopBar title="Merge Leads" />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Check size={52} style={{ color: 'var(--brand-green)', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Merge complete</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
            Activity history was reassigned to the surviving record.
          </p>
          <button className="btn btn-primary btn-md" onClick={reset}>Merge another</button>
        </div>
      </div>
    )
  }

  // ── Render: main page ─────────────────────────────────────
  return (
    <div className="page-content">
      <TopBar title="Merge Leads" />
      <div className="page-header">
        <div>
          <h1 className="page-title">Duplicate Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {loading ? 'Scanning...' : `${dupGroups.length} potential duplicate group${dupGroups.length !== 1 ? 's' : ''} detected`}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadLeads} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[['detect', 'Auto-detect'], ['manual', 'Manual search']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Auto-detect tab */}
      {tab === 'detect' && (
        loading ? (
          <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading leads...</div>
        ) : dupGroups.length === 0 ? (
          <div className="crm-card" style={{ padding: '48px', textAlign: 'center' }}>
            <Check size={36} style={{ color: 'var(--brand-green)', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>No duplicates detected</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>All company names in this entity look unique.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dupGroups.filter((_,gi) => !dismissed[gi]).map((group, gi) => (
              <div key={gi} className="crm-card">
                {/* Group header */}
                <div
                  onClick={() => setExpanded(e => ({ ...e, [gi]: !e[gi] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: expanded[gi] ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <AlertTriangle size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                    {group[0].company_name}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>· {group[0].entity}</span>
                  </span>
                  <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '10px' }}>
                    {group.length} entries
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setDismissed(d => ({ ...d, [gi]: true })) }}
                    className="btn btn-ghost btn-icon"
                    title="Dismiss — not duplicates"
                    style={{ padding: '2px', opacity: 0.5 }}
                  >
                    <X size={13} />
                  </button>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{expanded[gi] ? '▲' : '▼'}</span>
                </div>

                {/* Expanded: list each lead, pick two to compare */}
                {expanded[gi] && (
                  <div>
                    {group.map((lead, li) => (
                      <div key={lead.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 16px',
                        borderBottom: li < group.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{lead.company_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {lead.stage?.replace(/_/g, ' ')} · {lead.contact_name ?? '—'} · {lead.profiles?.full_name ?? 'unassigned'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {group.filter(o => o.id !== lead.id).map(other => (
                            <button
                              key={other.id}
                              onClick={() => startCompare(lead, other)}
                              className="btn btn-ghost btn-xs"
                              style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              Compare <ArrowRight size={10} />
                              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--brand-cyan)' }}>
                                {other.stage?.replace(/_/g, ' ')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Manual search tab */}
      {tab === 'manual' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <LeadPicker
              label="Lead A — will be kept"
              search={searchA} setSearch={setSearchA}
              results={resultsA} selected={leadA} onSelect={setLeadA}
            />
            <LeadPicker
              label="Lead B — will be merged in and dropped"
              search={searchB} setSearch={setSearchB}
              results={resultsB} selected={leadB} onSelect={setLeadB}
              disabled={!leadA}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-md"
              disabled={!leadA || !leadB}
              onClick={() => startCompare(leadA, leadB)}
            >
              <GitMerge size={15} /> Compare & Merge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
