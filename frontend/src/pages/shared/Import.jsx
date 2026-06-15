/**
 * Import — Smart multi-source import with cross-reference deduplication
 * Supports: CSV, Excel (.xlsx/.xls) with multiple sheets
 * Cross-references: phone (normalized), company name (fuzzy bigram), contact name
 * Modes: Total (single file) | By BD Rep (each sheet = one rep)
 */
import { useState, useRef, useEffect } from 'react'
import { useQueryClient }              from '@tanstack/react-query'
import {
  Upload, RefreshCw, CheckCircle2, X, FileText,
  AlertTriangle, Users, Building, Phone, User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/contexts/AuthContext'
import { useApp }   from '@/contexts/AppContext'
import TopBar       from '@/components/layout/TopBar'

// ── Constants ──────────────────────────────────────────────────
const VALID_STAGES = [
  'new_lead','reaching_out','no_response','meeting_done','negotiation',
  'prospect_active','prospect_cold','reconnect','client_active',
  'client_inactive','client_renewal','lost','unqualified',
]
const VALID_ENTITIES = ['EG', 'KSA']

// Universal column aliases → CRM field (Arabic + English + common typos)
const COLUMN_ALIASES = {
  company_name:        ['company_name','company','account','client','client_name','account_name',
                        'عميل','اسم العميل','شركة','اسم الشركة','organization','org','business'],
  entity:              ['entity','market','country','region','market_entity','territory'],
  contact_name:        ['contact_name','contact','person','full_name','client_contact',
                        'مسؤول','اسم المسؤول','contact_person','contact person','rep_contact'],
  contact_title:       ['contact_title','title','position','job_title','role','designation',
                        'المسمى','وظيفة','job title'],
  phone:               ['phone','mobile','tel','telephone','phone_number','mobile_number','cell',
                        'رقم','جوال','موبايل','رقم الهاتف','رقم الجوال','phone number','mobile number'],
  email:               ['email','e-mail','mail','email_address','work_email','البريد','ايميل','email address'],
  stage:               ['stage','status','pipeline_stage','phase','المرحلة','الحالة','pipeline stage'],
  lead_source:         ['source','lead_source','origin','channel','المصدر','how_found','lead source'],
  estimated_gmv_month: ['estimated_gmv_month','gmv','gmv_month','monthly_gmv','value',
                        'potential','estimated_value','القيمة','monthly value','expected gmv'],
  deal_value:          ['deal_value','deal','contract_value','قيمة الصفقة','deal value','contract value'],
  next_action:         ['next_action','action','task','todo','follow_up','الخطوة التالية','المهمة','next step','follow up'],
  next_action_date:    ['next_action_date','due_date','action_date','follow_up_date','follow_up date',
                        'تاريخ المتابعة','next_date','followup_date','due date'],
  notes:               ['notes','note','comments','comment','remarks','ملاحظات','ملاحظة','memo','description'],
  date_added:          ['date_added','added','created_at','date','created','تاريخ الإضافة','entry_date','date added'],
}

// ── Utility functions ──────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10) }

/** Normalize phone to digits only, strip country code */
function normalizePhone(p) {
  if (!p) return null
  let d = String(p).replace(/\D/g, '')
  if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2)   // +20 Egypt
  if (d.startsWith('966') && d.length >= 12) d = '0' + d.slice(3)   // +966 KSA
  if (d.startsWith('00') && d.length > 10)   d = '0' + d.slice(2)   // 00XX intl
  return d.length >= 9 ? d : null
}

/** Normalize text for fuzzy comparison: lowercase, strip noise words */
function normalizeText(s) {
  if (!s) return ''
  return String(s)
    .toLowerCase().trim()
    .replace(/[.,،؛;:\-_'"()​ ]/g, '')
    .replace(/\b(co|ltd|llc|inc|corp|group|grp|شركة|مؤسسة|مجموعة|holding|investments|int'l|international)\b/gi, '')
    .replace(/\s+/g, ' ').trim()
}

/** Bigram similarity — works for Arabic and English */
function similarity(a, b) {
  a = normalizeText(a); b = normalizeText(b)
  if (!a || !b) return 0
  if (a === b) return 1.0
  if (a.includes(b) || b.includes(a)) return 0.92
  const bigrams = s => {
    const m = new Map()
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2)
      m.set(bg, (m.get(bg) || 0) + 1)
    }
    return m
  }
  const b1 = bigrams(a), b2 = bigrams(b)
  let intersect = 0
  for (const [bg, cnt] of b1) intersect += Math.min(cnt, b2.get(bg) || 0)
  const total = (a.length - 1) + (b.length - 1)
  return total > 0 ? (2 * intersect) / total : 0
}

function parseDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Excel serial date
  if (/^\d{4,5}$/.test(s)) {
    const d = new Date((Number(s) - 25569) * 86400 * 1000)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  }
  const parts = s.split(/[/\-.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    if (a > 31) return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`
    if (c > 31) return `${c}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`
  }
  return null
}

function cleanText(s) {
  const v = s ? String(s).trim().replace(/\s+/g, ' ') : null
  return v || null
}

// ── XLSX CDN loader (no npm install needed) ───────────────────
async function loadXLSX() {
  if (window.XLSX) return window.XLSX
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    script.onload  = () => resolve(window.XLSX)
    script.onerror = () => reject(new Error('Could not load XLSX library — check your internet connection.'))
    document.head.appendChild(script)
  })
}

// ── File parser → [{sheetName, headers, rows}] ────────────────
async function parseFile(file) {
  if (file.name.match(/\.csv$/i)) {
    const text  = await file.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []

    function parseLine(line) {
      const fields = []; let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++ } else inQ = !inQ }
        else if (c === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
        else cur += c
      }
      fields.push(cur.trim())
      return fields
    }
    const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())
    const rows = lines.slice(1)
      .map(l => {
        const vals = parseLine(l)
        const obj  = {}
        headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
        return obj
      })
      .filter(r => Object.values(r).some(v => String(v).trim()))
    return [{ sheetName: file.name.replace(/\.csv$/i, ''), headers, rows }]
  }

  if (file.name.match(/\.xlsx?$/i)) {
    const XLSX = await loadXLSX()
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array', cellText: true, cellDates: false })
    return wb.SheetNames
      .map(name => {
        const ws   = wb.Sheets[name]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
        if (data.length < 2) return null
        const headers = data[0].map(h => String(h).toLowerCase().trim())
        const rows = data.slice(1)
          .map(r => {
            const obj = {}
            headers.forEach((h, i) => { obj[h] = String(r[i] ?? '').trim() })
            return obj
          })
          .filter(r => Object.values(r).some(v => String(v).trim()))
        return rows.length > 0 ? { sheetName: name, headers, rows } : null
      })
      .filter(Boolean)
  }

  throw new Error('Unsupported file type. Use .csv or .xlsx')
}

// ── Auto-detect column mapping ─────────────────────────────────
function detectMapping(headers) {
  const map = {}
  for (const h of headers) {
    const clean = h.toLowerCase().replace(/[\s_\-]+/g, '_').trim()
    const raw   = h.toLowerCase().trim()
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(clean) || aliases.includes(raw)) {
        if (!map[h]) map[h] = field
        break
      }
    }
  }
  return map
}

// ── Transform raw row → CRM lead object ───────────────────────
function transformRow(raw, colMap, userId, defaultEntity) {
  const mapped = {}
  for (const [h, val] of Object.entries(raw)) {
    const field = colMap[h]
    if (field) mapped[field] = val === '' ? null : val
  }

  const errors = []
  const company = cleanText(mapped.company_name)
  if (!company) errors.push('Missing company name')

  let ent = (mapped.entity ?? defaultEntity ?? '').toUpperCase().trim()
  if (ent === 'EGYPT') ent = 'EG'
  if (ent === 'SAUDI' || ent === 'KSA' || ent === 'SA') ent = 'KSA'
  if (!VALID_ENTITIES.includes(ent)) {
    if (defaultEntity) ent = defaultEntity
    else errors.push(`Unknown entity "${mapped.entity}" — set EG or KSA`)
  }

  const rawStage = mapped.stage?.toLowerCase().replace(/\s+/g,'_') ?? ''
  const stage    = VALID_STAGES.includes(rawStage) ? rawStage : 'new_lead'

  const row = {
    company_name:        company,
    entity:              ent || null,
    contact_name:        cleanText(mapped.contact_name),
    contact_title:       cleanText(mapped.contact_title),
    phone:               cleanText(mapped.phone),
    email:               cleanText(mapped.email),
    stage,
    lead_source:         cleanText(mapped.lead_source),
    notes:               cleanText(mapped.notes),
    next_action:         cleanText(mapped.next_action),
    next_action_date:    mapped.next_action_date ? parseDate(mapped.next_action_date) : null,
    estimated_gmv_month: mapped.estimated_gmv_month
      ? (parseFloat(String(mapped.estimated_gmv_month).replace(/,/g, '')) || null) : null,
    deal_value: mapped.deal_value
      ? (parseFloat(String(mapped.deal_value).replace(/,/g, '')) || null) : null,
    date_added:  mapped.date_added ? (parseDate(mapped.date_added) ?? today()) : today(),
    assigned_to: userId,
    is_sna:      false,
  }
  return { row, errors }
}

// ── Cross-reference a row against existing leads ──────────────
function matchRow(row, existingLeads) {
  const normPhone = normalizePhone(row.phone)

  // Priority 1: exact phone match (strongest signal)
  if (normPhone) {
    for (const ex of existingLeads) {
      if (normalizePhone(ex.phone) === normPhone) {
        return { matchId: ex.id, matchName: ex.company_name, confidence: 'phone' }
      }
    }
  }

  // Priority 2: company name fuzzy match (same entity preferred)
  let bestScore = 0, bestMatch = null
  for (const ex of existingLeads) {
    // Same entity is required when both sides have an entity
    if (row.entity && ex.entity && row.entity !== ex.entity) continue
    const s = similarity(row.company_name, ex.company_name)
    if (s > bestScore) { bestScore = s; bestMatch = ex }
  }

  if (bestScore >= 0.88) {
    // Contact name as a tiebreaker to boost or reduce confidence
    const contactSim = similarity(row.contact_name, bestMatch?.contact_name)
    const conf = bestScore >= 0.95 ? 'high' : contactSim > 0.7 ? 'high' : 'medium'
    return { matchId: bestMatch.id, matchName: bestMatch.company_name, confidence: conf }
  }
  if (bestScore >= 0.72) {
    return { matchId: bestMatch.id, matchName: bestMatch.company_name, confidence: 'low' }
  }

  return null
}

// ── Build full preview from all sheets ───────────────────────
function buildPreview(sheets, existingLeads, defaultEntity, defaultUserId) {
  const phonesSeen   = new Map()
  const companiesSeen = new Map()
  const rows = []

  for (const sheet of sheets) {
    if (sheet.skip) continue
    const assignTo = sheet.repId || defaultUserId

    for (const raw of sheet.rows) {
      const { row, errors } = transformRow(raw, sheet.colMap, assignTo, defaultEntity)

      if (errors.some(e => e.includes('Missing company'))) {
        rows.push({ row, action: 'skip', match: null, errors, sheetName: sheet.sheetName, reason: 'error' })
        continue
      }

      // In-file duplicate detection
      const normPhone   = normalizePhone(row.phone)
      const normCompany = `${normalizeText(row.company_name)}||${row.entity}`

      if ((normPhone && phonesSeen.has(normPhone)) || companiesSeen.has(normCompany)) {
        rows.push({ row, action: 'skip', match: null, errors, sheetName: sheet.sheetName, reason: 'in-file-duplicate' })
        continue
      }

      if (normPhone) phonesSeen.set(normPhone, rows.length)
      companiesSeen.set(normCompany, rows.length)

      const match = matchRow(row, existingLeads)
      rows.push({
        row, errors,
        action:    match ? 'update' : 'create',
        match,
        sheetName: sheet.sheetName,
        reason:    null,
      })
    }
  }
  return rows
}

// ── Confidence badge ──────────────────────────────────────────
const CONF_COLORS = { phone: '#22c55e', high: 'var(--brand-cyan)', medium: '#f59e0b', low: '#94a3b8' }
function ConfBadge({ confidence }) {
  return (
    <span style={{
      fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700,
      background: `${CONF_COLORS[confidence]}22`, color: CONF_COLORS[confidence],
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {confidence}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function Import() {
  const { userId, profile, isManager } = useAuth()
  const { toast }                      = useApp()
  const queryClient                    = useQueryClient()

  // Wizard stage: idle → loading → config (multi-sheet) → preview → done
  const [wizStage,     setWizStage]    = useState('idle')
  const [uploadMode,   setUploadMode]  = useState('total')  // total | by_rep
  const [entityFilter, setEntityFilter] = useState('EG')
  const [sheets,       setSheets]      = useState([])
  const [existingLeads, setExisting]   = useState([])
  const [bdReps,       setBdReps]      = useState([])
  const [previewRows,  setPreviewRows] = useState([])
  const [importing,    setImporting]   = useState(false)
  const [result,       setResult]      = useState(null)
  const [fileError,    setFileError]   = useState(null)
  const inputRef = useRef(null)

  // Fetch existing leads + reps once
  useEffect(() => {
    supabase.from('leads')
      .select('id, company_name, contact_name, phone, entity')
      .then(({ data }) => setExisting(data ?? []))
    supabase.from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['bd_rep','bd_am','bd_tl','cco'])
      .then(({ data }) => setBdReps(data ?? []))
  }, [])

  // ── Handle file upload ──────────────────────────────────────
  async function handleFile(file) {
    if (!file) return
    setFileError(null)
    setWizStage('loading')
    try {
      const parsed = await parseFile(file)
      if (parsed.length === 0) throw new Error('No data rows found. Make sure the file has headers and at least one data row.')

      const withMeta = parsed.map(s => ({
        ...s,
        colMap: detectMapping(s.headers),
        repId:  null,   // null = use current user
        skip:   false,
      }))
      setSheets(withMeta)

      if (parsed.length > 1) {
        // Multi-sheet: go to config step so user can assign reps
        setWizStage('config')
      } else {
        // Single sheet: skip config, go straight to preview
        const rows = buildPreview(withMeta, existingLeads, entityFilter, userId)
        setPreviewRows(rows)
        setWizStage('preview')
      }
    } catch (e) {
      setFileError(e.message)
      setWizStage('idle')
    }
  }

  function proceedToPreview() {
    const rows = buildPreview(sheets, existingLeads, entityFilter, userId)
    setPreviewRows(rows)
    setWizStage('preview')
  }

  // ── Toggle per-row action ──────────────────────────────────
  function toggleAction(i) {
    setPreviewRows(prev => {
      const updated = [...prev]
      const r = updated[i]
      if (r.reason === 'error') return prev   // can't restore error rows
      if (r.action === 'skip') {
        updated[i] = { ...r, action: r.match ? 'update' : 'create', reason: null }
      } else {
        updated[i] = { ...r, action: 'skip', reason: 'manual' }
      }
      return updated
    })
  }

  // ── Run the import ─────────────────────────────────────────
  async function runImport() {
    setImporting(true)
    const toCreate = previewRows.filter(r => r.action === 'create')
    const toUpdate = previewRows.filter(r => r.action === 'update' && r.match?.matchId)

    let created = 0, updated = 0, errs = []

    // Batch inserts
    for (let i = 0; i < toCreate.length; i += 100) {
      const batch = toCreate.slice(i, i + 100).map(r => r.row)
      const { error } = await supabase.from('leads').insert(batch)
      if (error) errs.push(error.message)
      else created += batch.length
    }

    // Updates: only overwrite non-empty incoming fields (preserve existing data)
    for (const r of toUpdate) {
      const u = {}
      if (r.row.contact_name)        u.contact_name        = r.row.contact_name
      if (r.row.contact_title)       u.contact_title       = r.row.contact_title
      if (r.row.phone)               u.phone               = r.row.phone
      if (r.row.email)               u.email               = r.row.email
      if (r.row.notes)               u.notes               = r.row.notes
      if (r.row.next_action)         u.next_action         = r.row.next_action
      if (r.row.next_action_date)    u.next_action_date    = r.row.next_action_date
      if (r.row.estimated_gmv_month) u.estimated_gmv_month = r.row.estimated_gmv_month
      if (r.row.lead_source)         u.lead_source         = r.row.lead_source
      if (Object.keys(u).length === 0) { updated++; continue }
      const { error } = await supabase.from('leads').update(u).eq('id', r.match.matchId)
      if (error) errs.push(error.message)
      else updated++
    }

    setResult({ created, updated, skipped: previewRows.filter(r => r.action === 'skip').length, errors: errs })
    if (created > 0 || updated > 0) {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast({ type: 'success', message: `${created} created · ${updated} updated` })
    }
    setImporting(false)
    setWizStage('done')
  }

  function reset() {
    setWizStage('idle'); setSheets([]); setPreviewRows([]); setResult(null); setFileError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const creates = previewRows.filter(r => r.action === 'create').length
  const updates = previewRows.filter(r => r.action === 'update').length
  const skips   = previewRows.filter(r => r.action === 'skip').length

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title="Smart Import" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '960px' }}>

        {/* ── IDLE ─────────────────────────────────────────── */}
        {wizStage === 'idle' && (
          <div>
            {/* Upload mode selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { id: 'total',  label: 'Total Upload',  sub: 'All reps in one file or single sheet', icon: Building },
                { id: 'by_rep', label: 'By BD Rep',      sub: 'Each Excel sheet = one rep',          icon: Users },
              ].map(m => {
                const Icon = m.icon
                const active = uploadMode === m.id
                return (
                  <button key={m.id} onClick={() => setUploadMode(m.id)} style={{
                    padding: '14px 16px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                    border: `2px solid ${active ? 'var(--brand-green)' : 'var(--border-default)'}`,
                    background: active ? 'rgba(34,197,94,0.06)' : 'var(--bg-card)',
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                  }}>
                    <Icon size={18} style={{ color: active ? 'var(--brand-green)' : 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: active ? 'var(--brand-green)' : 'var(--text-primary)' }}>{m.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Default entity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Default entity (if not in file):</span>
              {VALID_ENTITIES.map(e => (
                <button key={e} onClick={() => setEntityFilter(e)} style={{
                  fontSize: '12px', fontWeight: 600, padding: '4px 14px', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${entityFilter === e ? 'var(--brand-cyan)' : 'var(--border-default)'}`,
                  background: entityFilter === e ? 'rgba(34,211,238,0.1)' : 'transparent',
                  color: entityFilter === e ? 'var(--brand-cyan)' : 'var(--text-muted)',
                }}>
                  {e}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
              onDragOver={e => e.preventDefault()}
              style={{
                border: '2px dashed var(--border-default)', borderRadius: '12px',
                padding: '52px 24px', textAlign: 'center', cursor: 'pointer',
                background: 'var(--bg-card)', transition: 'border-color 0.15s',
              }}
            >
              <Upload size={28} style={{ color: 'var(--brand-green)', marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Drop your file here or click to browse
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                .xlsx (multiple sheets supported) or .csv · Any column structure
                <br />Matches by phone number, company name, and contact name
              </div>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>

            {fileError && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px' }}>
                <AlertTriangle size={13} style={{ display: 'inline', marginRight: '6px' }} />
                {fileError}
              </div>
            )}

            {/* Column reference */}
            <div style={{ marginTop: '24px', padding: '16px 18px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Auto-recognized column names
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px 16px' }}>
                {Object.entries(COLUMN_ALIASES).map(([field, aliases]) => (
                  <div key={field} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{field}</span>
                    <span style={{ color: 'var(--text-muted)' }}> · {aliases.slice(0, 3).join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LOADING ──────────────────────────────────────── */}
        {wizStage === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '80px 0' }}>
            <RefreshCw size={28} style={{ color: 'var(--brand-green)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Parsing file and cross-referencing against existing records…</div>
          </div>
        )}

        {/* ── CONFIG (multi-sheet: assign reps) ────────────── */}
        {wizStage === 'config' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {sheets.length} sheet{sheets.length !== 1 ? 's' : ''} detected
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {uploadMode === 'by_rep'
                  ? 'Assign each sheet to a BD rep. Leave blank to assign to your own account.'
                  : 'Review detected sheets before proceeding.'}
              </div>
            </div>

            {sheets.map((s, i) => (
              <div key={i} style={{
                padding: '14px 16px', borderRadius: '10px', marginBottom: '8px',
                background: s.skip ? 'var(--bg-base)' : 'var(--bg-card)',
                border: `1px solid ${s.skip ? 'var(--border-subtle)' : 'var(--border-default)'}`,
                opacity: s.skip ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={15} style={{ color: s.skip ? 'var(--text-muted)' : 'var(--brand-green)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {s.sheetName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {s.rows.length} rows · {Object.keys(s.colMap).length} columns mapped
                      {Object.keys(s.colMap).length > 0 && (
                        <span> ({Object.values(s.colMap).join(', ')})</span>
                      )}
                    </div>
                  </div>
                  {uploadMode === 'by_rep' && !s.skip && (
                    <select
                      value={s.repId ?? ''}
                      onChange={e => {
                        const upd = [...sheets]; upd[i] = { ...s, repId: e.target.value || null }; setSheets(upd)
                      }}
                      className="crm-input"
                      style={{ fontSize: '12px', width: '180px', flexShrink: 0 }}
                    >
                      <option value="">My account</option>
                      {bdReps.map(r => (
                        <option key={r.id} value={r.id}>{r.full_name ?? r.email}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => { const upd = [...sheets]; upd[i] = { ...s, skip: !s.skip }; setSheets(upd) }}
                    style={{
                      fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                      border: '1px solid var(--border-default)', background: 'transparent',
                      color: s.skip ? 'var(--brand-cyan)' : 'var(--text-muted)',
                    }}
                  >
                    {s.skip ? 'Include' : 'Skip'}
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button className="btn btn-primary btn-sm" onClick={proceedToPreview}
                disabled={sheets.every(s => s.skip)}>
                Preview import →
              </button>
              <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── PREVIEW ──────────────────────────────────────── */}
        {wizStage === 'preview' && (
          <div>
            {/* Summary tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'New leads',            count: creates, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
                { label: 'Update existing',       count: updates, color: 'var(--brand-cyan)', bg: 'rgba(34,211,238,0.08)' },
                { label: 'Skip (dup / error)',    count: skips,   color: '#94a3b8', bg: 'var(--bg-card)' },
              ].map(tile => (
                <div key={tile.label} style={{
                  padding: '14px 16px', borderRadius: '10px',
                  background: tile.bg, border: `1px solid ${tile.color}33`,
                }}>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: tile.color }}>{tile.count}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{tile.label}</div>
                </div>
              ))}
            </div>

            {/* Row table */}
            <div style={{ borderRadius: '10px', border: '1px solid var(--border-default)', overflow: 'hidden', marginBottom: '16px' }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.8fr 1.2fr 60px',
                padding: '8px 14px', background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-default)',
              }}>
                {['Company', 'Contact / Phone', 'Entity', 'Status', ''].map(h => (
                  <div key={h} style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                {previewRows.map((r, i) => {
                  const isSkip   = r.action === 'skip'
                  const isUpdate = r.action === 'update'
                  const isCreate = r.action === 'create'
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.8fr 1.2fr 60px',
                      padding: '7px 14px', borderBottom: '1px solid var(--border-subtle)',
                      opacity: isSkip ? 0.45 : 1,
                      background: isUpdate ? 'rgba(34,211,238,0.02)' : 'transparent',
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.row.company_name || '—'}
                        </div>
                        {r.match && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span>→ {r.match.matchName}</span>
                            <ConfBadge confidence={r.match.confidence} />
                          </div>
                        )}
                        {r.reason === 'in-file-duplicate' && (
                          <div style={{ fontSize: '10px', color: '#f59e0b' }}>duplicate in this file</div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden' }}>
                        {r.row.contact_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={10} style={{ flexShrink: 0 }} /> {r.row.contact_name}
                          </div>
                        )}
                        {r.row.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                            <Phone size={10} style={{ flexShrink: 0 }} /> {r.row.phone}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>{r.row.entity}</div>
                      <div style={{ alignSelf: 'center' }}>
                        {isCreate && <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>NEW</span>}
                        {isUpdate && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>UPDATE</span>}
                        {isSkip   && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SKIP</span>
                        )}
                        {r.errors?.length > 0 && !r.errors.some(e => e.includes('Missing company')) && (
                          <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>{r.errors[0]}</div>
                        )}
                        {r.errors?.some(e => e.includes('Missing company')) && (
                          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>missing company</div>
                        )}
                      </div>
                      <div style={{ alignSelf: 'center' }}>
                        {r.reason !== 'error' && (
                          <button
                            onClick={() => toggleAction(i)}
                            style={{
                              fontSize: '10px', padding: '2px 7px', borderRadius: '5px', cursor: 'pointer',
                              border: '1px solid var(--border-default)', background: 'transparent',
                              color: isSkip ? 'var(--brand-cyan)' : 'var(--text-muted)',
                            }}
                          >
                            {isSkip ? 'Add' : 'Skip'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={runImport}
                disabled={importing || (creates + updates === 0)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={13} />
                {importing ? 'Importing…' : `Confirm — ${creates} new · ${updates} updates`}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── DONE ─────────────────────────────────────────── */}
        {wizStage === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CheckCircle2 size={44} style={{ color: '#22c55e', marginBottom: '16px' }} />
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Import complete
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 2, marginBottom: '28px' }}>
              {result.created > 0 && <div>{result.created} new lead{result.created !== 1 ? 's' : ''} created</div>}
              {result.updated > 0 && <div>{result.updated} existing lead{result.updated !== 1 ? 's' : ''} updated</div>}
              {result.skipped > 0 && <div style={{ color: 'var(--text-muted)' }}>{result.skipped} rows skipped</div>}
              {result.errors?.length > 0 && (
                <div style={{ color: '#ef4444', marginTop: '8px' }}>
                  {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>{result.errors.slice(0,3).join('; ')}</div>
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={reset}>Import another file</button>
          </div>
        )}

      </div>
    </div>
  )
}
