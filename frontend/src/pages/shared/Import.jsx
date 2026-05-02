/**
 * Import — CSV/Excel bulk lead import
 */
import { useState, useRef, useCallback } from 'react'
import { useQueryClient }                from '@tanstack/react-query'
import { Upload, AlertTriangle, CheckCircle2, X, FileText } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'
import TopBar        from '@/components/layout/TopBar'

const VALID_STAGES = [
  'new_lead','reaching_out','no_response','meeting_done',
  'negotiation','prospect_active','prospect_cold',
  'reconnect','client_active','client_inactive',
  'client_renewal','lost','unqualified',
]

const VALID_ENTITIES = ['EG', 'KSA']

const COLUMN_MAP = {
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

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseLine(line) {
    const fields = []
    let cur = ''
    let inQ  = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        fields.push(cur.trim())
        cur = ''
      } else {
        cur += c
      }
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(l => {
    const vals = parseLine(l)
    const obj  = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

function buildHeaderMap(rawHeaders) {
  const map = {}
  for (const raw of rawHeaders) {
    for (const [canonical, aliases] of Object.entries(COLUMN_MAP)) {
      if (aliases.includes(raw.toLowerCase())) {
        map[raw] = canonical
        break
      }
    }
  }
  return map
}

function transformRow(raw, headerMap, userId) {
  const row = {}
  for (const [rawKey, val] of Object.entries(raw)) {
    const canon = headerMap[rawKey]
    if (canon) row[canon] = val === '' ? null : val
  }

  const errors = []

  if (!row.company_name) errors.push('Missing company_name')
  if (!row.entity)       errors.push('Missing entity')
  else if (!VALID_ENTITIES.includes(row.entity.toUpperCase())) errors.push('Invalid entity "' + row.entity + '"')
  else row.entity = row.entity.toUpperCase()

  if (!row.stage) {
    row.stage = 'new_lead'
  } else if (!VALID_STAGES.includes(row.stage)) {
    errors.push('Invalid stage "' + row.stage + '"')
  }

  if (row.estimated_gmv_month != null) {
    const n = parseFloat(String(row.estimated_gmv_month).replace(/,/g, ''))
    row.estimated_gmv_month = isNaN(n) ? null : n
  }

  if (row.next_action_date) {
    const parsed = parseDate(row.next_action_date)
    if (!parsed) errors.push('Invalid date "' + row.next_action_date + '"')
    else row.next_action_date = parsed
  }
  if (row.date_added) {
    const parsed = parseDate(row.date_added)
    row.date_added = parsed ?? new Date().toISOString().slice(0, 10)
  } else {
    row.date_added = new Date().toISOString().slice(0, 10)
  }

  row.assigned_to = userId
  row.is_sna      = false

  return { row, errors }
}

export default function Import() {
  const { userId }     = useAuth()
  const { t, toast }   = useApp()
  const queryClient    = useQueryClient()
  const inputRef       = useRef(null)

  const [file,        setFile]        = useState(null)
  const [parsed,      setParsed]      = useState(null)
  const [importing,   setImporting]   = useState(false)
  const [result,      setResult]      = useState(null)
  const [dragOver,    setDragOver]    = useState(false)

  const handleFile = useCallback(async (f) => {
    if (!f) return
    setFile(f)
    setParsed(null)
    setResult(null)

    const text = await f.text()
    let raw

    if (f.name.endsWith('.csv')) {
      raw = parseCSV(text)
    } else {
      toast('Only CSV files are supported. Export your spreadsheet as CSV first.', 'error')
      setFile(null)
      return
    }

    if (raw.rows.length === 0) {
      toast('File is empty or has no data rows.', 'error')
      setFile(null)
      return
    }

    const headerMap = buildHeaderMap(raw.headers)
    const valid   = []
    const skipped = []

    for (const rawRow of raw.rows) {
      const { row, errors } = transformRow(rawRow, headerMap, userId)
      if (errors.length > 0) {
        skipped.push({ rawRow, errors })
      } else {
        valid.push(row)
      }
    }

    setParsed({ valid, skipped, total: raw.rows.length })
  }, [userId])

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleImport() {
    if (!parsed?.valid?.length) return
    setImporting(true)

    try {
      const { data: existing } = await supabase
        .from('leads')
        .select('company_name, entity')
        .eq('assigned_to', userId)

      const existingSet = new Set((existing ?? []).map(r => r.company_name + '||' + r.entity))

      const toInsert   = []
      const duplicates = []

      for (const row of parsed.valid) {
        const key = row.company_name + '||' + row.entity
        if (existingSet.has(key)) duplicates.push(row.company_name)
        else toInsert.push(row)
      }

      let insertedCount = 0
      let insertErrors  = []

      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += 100) {
          const batch = toInsert.slice(i, i + 100)
          const { error } = await supabase.from('leads').insert(batch)
          if (error) insertErrors.push(error.message)
          else insertedCount += batch.length
        }
      }

      setResult({ inserted: insertedCount, duplicates, errors: insertErrors })

      if (insertedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['leads'] })
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
        toast(insertedCount + ' lead' + (insertedCount !== 1 ? 's' : '') + ' imported', 'success')
      }
    } catch (err) {
      toast(err.message ?? 'Import failed', 'error')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setFile(null)
    setParsed(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title={t('nav.import')} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '680px' }}>

        {!file && (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            style={{
              border: '2px dashed ' + (dragOver ? 'var(--brand-cyan)' : 'var(--border-default)'),
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(34,211,238,0.04)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Drop a CSV file here
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              or click to browse
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Supported: .csv (Excel / Google Sheets export)
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {file && parsed && !result && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 16px', borderRadius: '10px',
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              marginBottom: '16px',
            }}>
              <FileText size={18} style={{ color: 'var(--brand-cyan)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {parsed.total} rows parsed
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={reset} title="Remove">
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#22c55e' }}>{parsed.valid.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Ready to import</div>
              </div>
              <div style={{
                padding: '14px', borderRadius: '8px',
                background: parsed.skipped.length > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)',
                border: '1px solid ' + (parsed.skipped.length > 0 ? 'rgba(239,68,68,0.2)' : 'var(--border-default)'),
              }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: parsed.skipped.length > 0 ? '#ef4444' : 'var(--text-muted)' }}>{parsed.skipped.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Rows with errors</div>
              </div>
            </div>

            {parsed.skipped.length > 0 && (
              <div style={{ marginBottom: '16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ef4444', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={12} /> Skipped rows
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {parsed.skipped.slice(0, 20).map((s, i) => (
                    <div key={i} style={{ padding: '8px 14px', fontSize: '12px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Row {i + 2}:</span>
                      {s.errors.join(', ')}
                    </div>
                  ))}
                  {parsed.skipped.length > 20 && (
                    <div style={{ padding: '8px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      ...and {parsed.skipped.length - 20} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {parsed.valid.length > 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary btn-md" onClick={handleImport} disabled={importing} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={14} />
                  {importing ? 'Importing…' : 'Import ' + parsed.valid.length + ' lead' + (parsed.valid.length !== 1 ? 's' : '')}
                </button>
                <button className="btn btn-ghost btn-md" onClick={reset}>Cancel</button>
              </div>
            )}

            {parsed.valid.length === 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-ghost btn-md" onClick={reset}>Try another file</button>
              </div>
            )}
          </div>
        )}

        {result && (
          <div>
            <div style={{ padding: '20px', borderRadius: '12px', background: result.inserted > 0 ? 'rgba(34,197,94,0.06)' : 'var(--bg-card)', border: '1px solid ' + (result.inserted > 0 ? 'rgba(34,197,94,0.2)' : 'var(--border-default)'), marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              {result.inserted > 0
                ? <CheckCircle2 size={22} style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }} />
                : <AlertTriangle size={22} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
              }
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {result.inserted > 0
                    ? result.inserted + ' lead' + (result.inserted !== 1 ? 's' : '') + ' imported successfully'
                    : 'No leads imported'
                  }
                </div>
                {result.duplicates.length > 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {result.duplicates.length} duplicate{result.duplicates.length !== 1 ? 's' : ''} skipped:
                    {' '}{result.duplicates.slice(0, 5).join(', ')}{result.duplicates.length > 5 ? ' and ' + (result.duplicates.length - 5) + ' more' : ''}
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div style={{ fontSize: '13px', color: '#ef4444' }}>
                    {result.errors.length} insert error{result.errors.length !== 1 ? 's' : ''}.
                  </div>
                )}
              </div>
            </div>
            <button className="btn btn-ghost btn-md" onClick={reset}>Import another file</button>
          </div>
        )}

        {!file && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--border-default)' }}>
              Supported columns
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {Object.entries(COLUMN_MAP).map(([canon, aliases]) => (
                <div key={canon} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{canon}</span>
                  {' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    ({aliases.slice(0, 2).join(', ')})
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <strong>Required:</strong> company_name, entity (EG or KSA)<br />
              <strong>Dates:</strong> YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY<br />
              <strong>Duplicates:</strong> skipped (same company_name + entity)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function parseDate(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim()
  const iso = trimmed.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) return trimmed
  const parts = trimmed.split(/[\/\-.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    if (a > 31) return a + '-' + String(b).padStart(2,'0') + '-' + String(c).padStart(2,'0')
    return c + '-' + String(b).padStart(2,'0') + '-' + String(a).padStart(2,'0')
  }
  return null
}
