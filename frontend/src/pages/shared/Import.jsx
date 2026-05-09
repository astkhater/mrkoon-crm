/**
 * Import — dual-zone CSV import
 * Zone 1: Mrkoon System daily export (full lead schema)
 * Zone 2: LinkedIn campaign leads export
 */
import { useState, useRef, useCallback } from 'react'
import { useQueryClient }                from '@tanstack/react-query'
import { Upload, AlertTriangle, CheckCircle2, X, FileText, Linkedin, Database } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'
import TopBar        from '@/components/layout/TopBar'

// ── Constants ─────────────────────────────────────────────────
const VALID_STAGES = [
  'new_lead','reaching_out','no_response','meeting_done',
  'negotiation','prospect_active','prospect_cold',
  'reconnect','client_active','client_inactive',
  'client_renewal','lost','unqualified',
]
const VALID_ENTITIES = ['EG', 'KSA']

const MRKOON_COLUMN_MAP = {
  company_name:        ['company_name', 'company', 'name', 'account'],
  entity:              ['entity', 'market', 'country', 'region'],
  contact_name:        ['contact_name', 'contact', 'person', 'full_name'],
  contact_title:       ['contact_title', 'title', 'position', 'job_title'],
  phone:               ['phone', 'mobile', 'tel', 'telephone'],
  email:               ['email', 'e-mail', 'mail'],
  stage:               ['stage', 'status', 'pipeline_stage'],
  estimated_gmv_month: ['estimated_gmv_month', 'gmv', 'gmv_month', 'monthly_gmv', 'value'],
  next_action:         ['next_action', 'action', 'task', 'todo'],
  next_action_date:    ['next_action_date', 'due_date', 'action_date', 'follow_up_date'],
  notes:               ['notes', 'note', 'comments', 'comment'],
  source:              ['source', 'lead_source', 'origin'],
  date_added:          ['date_added', 'added', 'created_at', 'date'],
}

// LinkedIn export column aliases
const LINKEDIN_COLUMN_MAP = {
  _first_name:    ['first_name', 'firstname', 'first name'],
  _last_name:     ['last_name', 'lastname', 'last name'],
  company_name:   ['company', 'company name', 'organization', 'company_name'],
  contact_title:  ['title', 'job title', 'jobtitle', 'position'],
  email:          ['email', 'email address', 'emailaddress', 'work email'],
  phone:          ['phone', 'mobile', 'phone number', 'phonenumber'],
  entity:         ['entity', 'market', 'country', 'region'],
  notes:          ['campaign', 'campaign_name', 'campaign name', 'lead_gen_form_name', 'lead gen form name', 'form name', 'notes'],
}

// ── CSV parser ────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseLine(line) {
    const fields = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
      else cur += c
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
  const rawHeaders = parseLine(lines[0]).map(h => h.toLowerCase())
  const rows = lines.slice(1).map(l => {
    const vals = parseLine(l)
    const obj  = {}
    rawHeaders.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
  return { headers: rawHeaders, rows }
}

function buildHeaderMap(rawHeaders, columnMap) {
  const map = {}
  for (const raw of rawHeaders) {
    for (const [canonical, aliases] of Object.entries(columnMap)) {
      if (aliases.includes(raw.toLowerCase())) { map[raw] = canonical; break }
    }
  }
  return map
}

// ── Mrkoon transform ──────────────────────────────────────────
function transformMrkoonRow(raw, headerMap, userId) {
  const row = {}
  for (const [rawKey, val] of Object.entries(raw)) {
    const canon = headerMap[rawKey]
    if (canon) row[canon] = val === '' ? null : val
  }
  const errors = []
  if (!row.company_name) errors.push('Missing company_name')
  if (!row.entity)       errors.push('Missing entity')
  else if (!VALID_ENTITIES.includes(row.entity.toUpperCase())) errors.push(`Invalid entity "${row.entity}"`)
  else row.entity = row.entity.toUpperCase()
  if (!row.stage)                                   row.stage = 'new_lead'
  else if (!VALID_STAGES.includes(row.stage))       errors.push(`Invalid stage "${row.stage}"`)
  if (row.estimated_gmv_month != null) {
    const n = parseFloat(String(row.estimated_gmv_month).replace(/,/g, ''))
    row.estimated_gmv_month = isNaN(n) ? null : n
  }
  if (row.next_action_date) {
    const p = parseDate(row.next_action_date)
    if (!p) errors.push(`Invalid date "${row.next_action_date}"`)
    else row.next_action_date = p
  }
  row.date_added  = row.date_added ? (parseDate(row.date_added) ?? today()) : today()
  row.assigned_to = userId
  row.is_sna      = false
  return { row, errors }
}

// ── LinkedIn transform ────────────────────────────────────────
function transformLinkedInRow(raw, headerMap, userId, defaultEntity) {
  const mapped = {}
  for (const [rawKey, val] of Object.entries(raw)) {
    const canon = headerMap[rawKey]
    if (canon) mapped[canon] = val === '' ? null : val
  }

  const errors = []
  const first  = mapped._first_name ?? ''
  const last   = mapped._last_name  ?? ''
  const name   = [first, last].filter(Boolean).join(' ').trim()

  if (!mapped.company_name) errors.push('Missing company')

  const entity = (mapped.entity ?? defaultEntity ?? '').toUpperCase()
  if (!VALID_ENTITIES.includes(entity)) errors.push(`Invalid entity "${entity}" — set a default or add entity column`)

  const row = {
    company_name:   mapped.company_name,
    contact_name:   name || null,
    contact_title:  mapped.contact_title  ?? null,
    email:          mapped.email          ?? null,
    phone:          mapped.phone          ?? null,
    entity,
    stage:          'new_lead',
    source:         'linkedin',
    notes:          mapped.notes          ?? null,
    date_added:     today(),
    assigned_to:    userId,
    is_sna:         false,
  }

  return { row, errors }
}

function today() { return new Date().toISOString().slice(0, 10) }

function parseDate(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parts = trimmed.split(/[/\-.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    if (a > 31) return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`
    return `${c}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`
  }
  return null
}

// ── Drop Zone component ───────────────────────────────────────
function DropZone({ label, sublabel, icon: Icon, accentColor, onFile, disabled }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? accentColor : 'var(--border-default)'}`,
        borderRadius: '12px',
        padding: '32px 20px',
        textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
        background: dragOver ? `${accentColor}0a` : 'transparent',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        flex: 1,
      }}
    >
      <Icon size={24} style={{ color: accentColor, marginBottom: '10px' }} />
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{sublabel}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Drop CSV or click to browse</div>
      <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
        onChange={e => onFile(e.target.files[0])} />
    </div>
  )
}

// ── Zone result panel ─────────────────────────────────────────
function ZoneResult({ result, onReset }) {
  return (
    <div>
      <div style={{
        padding: '16px', borderRadius: '10px',
        background: result.inserted > 0 ? 'rgba(34,197,94,0.06)' : 'var(--bg-card)',
        border: `1px solid ${result.inserted > 0 ? 'rgba(34,197,94,0.2)' : 'var(--border-default)'}`,
        marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '12px',
      }}>
        {result.inserted > 0
          ? <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
          : <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
        }
        <div style={{ fontSize: '13px' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {result.inserted > 0
              ? `${result.inserted} lead${result.inserted !== 1 ? 's' : ''} imported`
              : 'No leads imported'}
          </div>
          {result.duplicates?.length > 0 && (
            <div style={{ color: 'var(--text-muted)' }}>
              {result.duplicates.length} duplicate{result.duplicates.length !== 1 ? 's' : ''} skipped
            </div>
          )}
          {result.errors?.length > 0 && (
            <div style={{ color: '#ef4444' }}>{result.errors.length} insert error{result.errors.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onReset}>Import another file</button>
    </div>
  )
}

// ── Zone preview panel ────────────────────────────────────────
function ZonePreview({ file, parsed, importing, onImport, onReset, importLabel }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 14px', borderRadius: '8px',
        background: 'var(--bg-card)', border: '1px solid var(--border-default)',
        marginBottom: '12px',
      }}>
        <FileText size={16} style={{ color: 'var(--brand-cyan)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{parsed.total} rows parsed</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onReset}><X size={13} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>{parsed.valid.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Ready to import</div>
        </div>
        <div style={{
          padding: '12px', borderRadius: '8px',
          background: parsed.skipped.length > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)',
          border: `1px solid ${parsed.skipped.length > 0 ? 'rgba(239,68,68,0.2)' : 'var(--border-default)'}`,
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: parsed.skipped.length > 0 ? '#ef4444' : 'var(--text-muted)' }}>
            {parsed.skipped.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Rows with errors</div>
        </div>
      </div>

      {parsed.skipped.length > 0 && (
        <div style={{ marginBottom: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ef4444', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={11} /> Skipped rows
          </div>
          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            {parsed.skipped.slice(0, 20).map((s, i) => (
              <div key={i} style={{ padding: '7px 12px', fontSize: '12px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Row {i + 2}:</span>
                {s.errors.join(', ')}
              </div>
            ))}
            {parsed.skipped.length > 20 && (
              <div style={{ padding: '7px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>…and {parsed.skipped.length - 20} more</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {parsed.valid.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={onImport} disabled={importing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={13} />
            {importing ? 'Importing…' : importLabel}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onReset}>
          {parsed.valid.length === 0 ? 'Try another file' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function Import() {
  const { userId, entityView } = useAuth()
  const { t, toast }           = useApp()
  const queryClient            = useQueryClient()

  // Zone 1: Mrkoon System
  const [mFile,      setMFile]      = useState(null)
  const [mParsed,    setMParsed]    = useState(null)
  const [mImporting, setMImporting] = useState(false)
  const [mResult,    setMResult]    = useState(null)

  // Zone 2: LinkedIn
  const [lFile,      setLFile]      = useState(null)
  const [lParsed,    setLParsed]    = useState(null)
  const [lImporting, setLImporting] = useState(false)
  const [lResult,    setLResult]    = useState(null)
  const [lEntity,    setLEntity]    = useState(entityView === 'KSA' ? 'KSA' : 'EG')

  // ── Parse Mrkoon file ───────────────────────────────────────
  const handleMrkoonFile = useCallback(async (f) => {
    if (!f) return
    if (!f.name.endsWith('.csv')) { toast({ type: 'error', message: 'Only CSV files are supported.' }); return }
    setMFile(f); setMParsed(null); setMResult(null)
    const text = await f.text()
    const raw  = parseCSV(text)
    if (raw.rows.length === 0) { toast({ type: 'error', message: 'File is empty.' }); setMFile(null); return }
    const headerMap = buildHeaderMap(raw.headers, MRKOON_COLUMN_MAP)
    const valid = [], skipped = []
    for (const row of raw.rows) {
      const { row: r, errors } = transformMrkoonRow(row, headerMap, userId)
      if (errors.length > 0) skipped.push({ rawRow: row, errors })
      else valid.push(r)
    }
    setMParsed({ valid, skipped, total: raw.rows.length })
  }, [userId])

  // ── Parse LinkedIn file ─────────────────────────────────────
  const handleLinkedInFile = useCallback(async (f) => {
    if (!f) return
    if (!f.name.endsWith('.csv')) { toast({ type: 'error', message: 'Only CSV files are supported.' }); return }
    setLFile(f); setLParsed(null); setLResult(null)
    const text = await f.text()
    const raw  = parseCSV(text)
    if (raw.rows.length === 0) { toast({ type: 'error', message: 'File is empty.' }); setLFile(null); return }
    const headerMap = buildHeaderMap(raw.headers, LINKEDIN_COLUMN_MAP)
    const valid = [], skipped = []
    for (const row of raw.rows) {
      const { row: r, errors } = transformLinkedInRow(row, headerMap, userId, lEntity)
      if (errors.length > 0) skipped.push({ rawRow: row, errors })
      else valid.push(r)
    }
    setLParsed({ valid, skipped, total: raw.rows.length })
  }, [userId, lEntity])

  // ── Import helpers ──────────────────────────────────────────
  async function runImport(rows, setImporting, setResult) {
    setImporting(true)
    try {
      const { data: existing } = await supabase.from('leads').select('company_name, entity').eq('assigned_to', userId)
      const existingSet = new Set((existing ?? []).map(r => `${r.company_name}||${r.entity}`))
      const toInsert = [], duplicates = []
      for (const row of rows) {
        const key = `${row.company_name}||${row.entity}`
        if (existingSet.has(key)) duplicates.push(row.company_name)
        else toInsert.push(row)
      }
      let insertedCount = 0, insertErrors = []
      for (let i = 0; i < toInsert.length; i += 100) {
        const { error } = await supabase.from('leads').insert(toInsert.slice(i, i + 100))
        if (error) insertErrors.push(error.message)
        else insertedCount += Math.min(100, toInsert.length - i)
      }
      setResult({ inserted: insertedCount, duplicates, errors: insertErrors })
      if (insertedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['leads'] })
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
        toast({ type: 'success', message: `${insertedCount} lead${insertedCount !== 1 ? 's' : ''} imported` })
      }
    } catch (err) {
      toast({ type: 'error', message: err.message ?? 'Import failed' })
    } finally {
      setImporting(false)
    }
  }

  function resetMrkoon()   { setMFile(null); setMParsed(null); setMResult(null) }
  function resetLinkedIn() { setLFile(null); setLParsed(null); setLResult(null) }

  const anyActive = mFile || lFile

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title={t('nav.import')} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '900px' }}>

        {/* ── Drop zones ── */}
        {!anyActive && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <DropZone
              label="Mrkoon System Export"
              sublabel="Daily export from the CRM system"
              icon={Database}
              accentColor="var(--brand-green)"
              onFile={handleMrkoonFile}
            />
            <div style={{ flex: 1 }}>
              {/* LinkedIn entity selector */}
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Default entity:</span>
                {VALID_ENTITIES.map(e => (
                  <button key={e} onClick={() => setLEntity(e)}
                    style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '6px',
                      border: `1px solid ${lEntity === e ? 'var(--brand-cyan)' : 'var(--border-default)'}`,
                      background: lEntity === e ? 'rgba(34,211,238,0.1)' : 'transparent',
                      color: lEntity === e ? 'var(--brand-cyan)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}>
                    {e}
                  </button>
                ))}
              </div>
              <DropZone
                label="LinkedIn Campaign"
                sublabel="Lead gen form export from LinkedIn Ads"
                icon={Linkedin}
                accentColor="var(--brand-cyan)"
                onFile={handleLinkedInFile}
              />
            </div>
          </div>
        )}

        {/* ── Active zones ── */}
        <div style={{ display: anyActive ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

          {/* Mrkoon zone active */}
          <div>
            {!mFile && !anyActive && null}
            {mFile && mParsed && !mResult && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Database size={14} style={{ color: 'var(--brand-green)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mrkoon System</span>
                </div>
                <ZonePreview
                  file={mFile} parsed={mParsed} importing={mImporting}
                  onImport={() => runImport(mParsed.valid, setMImporting, setMResult)}
                  onReset={resetMrkoon}
                  importLabel={`Import ${mParsed.valid.length} lead${mParsed.valid.length !== 1 ? 's' : ''}`}
                />
              </div>
            )}
            {mResult && <ZoneResult result={mResult} onReset={resetMrkoon} />}
          </div>

          {/* LinkedIn zone active */}
          <div>
            {lFile && lParsed && !lResult && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Linkedin size={14} style={{ color: 'var(--brand-cyan)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LinkedIn · {lEntity}</span>
                </div>
                <ZonePreview
                  file={lFile} parsed={lParsed} importing={lImporting}
                  onImport={() => runImport(lParsed.valid, setLImporting, setLResult)}
                  onReset={resetLinkedIn}
                  importLabel={`Import ${lParsed.valid.length} lead${lParsed.valid.length !== 1 ? 's' : ''}`}
                />
              </div>
            )}
            {lResult && <ZoneResult result={lResult} onReset={resetLinkedIn} />}
          </div>

        </div>

        {/* ── Column references (shown when idle) ── */}
        {!anyActive && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-default)' }}>
                Mrkoon Export — Columns
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                {Object.entries(MRKOON_COLUMN_MAP).map(([canon, aliases]) => (
                  <div key={canon} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{canon}</span>
                    {' '}<span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({aliases[0]})</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <strong>Required:</strong> company_name, entity (EG or KSA)
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-default)' }}>
                LinkedIn Export — Columns
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                {[
                  ['first_name',   'First Name'],
                  ['last_name',    'Last Name'],
                  ['company',      'Company'],
                  ['title',        'Job Title'],
                  ['email',        'Email Address'],
                  ['phone',        'Phone Number'],
                  ['entity',       'entity (optional)'],
                  ['campaign',     '→ notes field'],
                ].map(([col, hint]) => (
                  <div key={col} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{col}</span>
                    {' '}<span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({hint})</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <strong>Required:</strong> company · All leads → new_lead, source=linkedin
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
