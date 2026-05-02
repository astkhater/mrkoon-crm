import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Calendar as CalIcon, Clock, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/contexts/AuthContext'
import { useApp }    from '@/contexts/AppContext'
import TopBar        from '@/components/layout/TopBar'
import LeadPanel     from '@/components/pipeline/LeadPanel'
import AddEventModal from '@/components/calendar/AddEventModal'

const STAGE_COLORS = {
  new_lead:'#64748b', reaching_out:'#3b82f6', no_response:'#6366f1', meeting_done:'#8b5cf6',
  negotiation:'#f59e0b', prospect_active:'#22c55e', prospect_cold:'#94a3b8', reconnect:'#f97316',
  client_active:'#22c55e', client_inactive:'#ef4444', client_renewal:'#f59e0b', lost:'#ef4444', unqualified:'#475569',
}
const EVENT_TYPE_COLORS = { meeting_onsite:'#8b5cf6', meeting_online:'#3b82f6', call:'#22c55e', site_visit:'#f97316', follow_up:'#f59e0b', other:'#64748b' }
const EVENT_TYPE_LABELS = { meeting_onsite:'On-site Meeting', meeting_online:'Online Meeting', call:'Call', site_visit:'Site Visit', follow_up:'Follow-up', other:'Other' }
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function toYMD(date) {
  return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0')
}
function isoToYMD(s) { return s?.slice(0,10) ?? '' }

async function fetchMonthLeads(userId, isManager, repFilter, startISO, endISO) {
  let q = supabase.from('leads')
    .select('id, company_name, stage, contact_name, next_action, next_action_date, assigned_to, profiles:assigned_to(full_name)')
    .gte('next_action_date', startISO).lte('next_action_date', endISO).order('next_action_date')
  if (!isManager) q = q.eq('assigned_to', userId)
  else if (repFilter) q = q.eq('assigned_to', repFilter)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

async function fetchMonthEvents(userId, isManager, startISO, endISO) {
  let q = supabase.from('calendar_events')
    .select('id, title, starts_at, ends_at, event_type, location, lead_id, leads(company_name)')
    .gte('starts_at', startISO + 'T00:00:00').lte('starts_at', endISO + 'T23:59:59').order('starts_at')
  if (!isManager) q = q.eq('created_by', userId)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

async function fetchReps() {
  const { data } = await supabase.from('profiles').select('id, full_name').in('role',['bd_rep','am','tl']).order('full_name')
  return data ?? []
}

async function fetchIntegration(userId) {
  const { data } = await supabase.from('calendar_integrations')
    .select('id, is_active, last_synced_at').eq('user_id', userId).eq('is_active', true).eq('provider','google').maybeSingle()
  return data ?? null
}

export default function Calendar() {
  const today = new Date()
  const { userId, isManager } = useAuth()
  const { t, lang, toast }    = useApp()
  const queryClient           = useQueryClient()
  const navigate              = useNavigate()

  const [year,         setYear]        = useState(today.getFullYear())
  const [month,        setMonth]       = useState(today.getMonth())
  const [selectedDay,  setSelectedDay] = useState(null)
  const [repFilter,    setRepFilter]   = useState('')
  const [leadPanelId,  setLeadPanelId] = useState(null)
  const [addEventOpen, setAddEventOpen]= useState(false)
  const [syncing,      setSyncing]     = useState(false)

  const monthStart = new Date(year, month, 1)
  const monthEnd   = new Date(year, month + 1, 0)
  const startISO   = toYMD(monthStart)
  const endISO     = toYMD(monthEnd)

  const { data: leads  = [] } = useQuery({ queryKey:['cal-leads',year,month,userId,isManager,repFilter], queryFn:() => fetchMonthLeads(userId,isManager,repFilter,startISO,endISO), staleTime:30_000 })
  const { data: events = [] } = useQuery({ queryKey:['calendar-events',year,month,userId,isManager], queryFn:() => fetchMonthEvents(userId,isManager,startISO,endISO), staleTime:30_000 })
  const { data: reps   = [] } = useQuery({ queryKey:['pipeline-reps'], queryFn:fetchReps, enabled:isManager, staleTime:120_000 })
  const { data: integration } = useQuery({ queryKey:['google-integration',userId], queryFn:() => fetchIntegration(userId), staleTime:60_000 })

  const googleConnected = !!integration

  const dayMap = useMemo(() => {
    const map = {}
    for (const lead of leads) {
      const key = isoToYMD(lead.next_action_date)
      if (!map[key]) map[key] = { leads:[], events:[] }
      map[key].leads.push(lead)
    }
    for (const ev of events) {
      const key = isoToYMD(ev.starts_at)
      if (!map[key]) map[key] = { leads:[], events:[] }
      map[key].events.push(ev)
    }
    return map
  }, [leads, events])

  const gridDays = useMemo(() => {
    const start = new Date(monthStart)
    const dow = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dow)
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d })
  }, [year, month])

  function prevMonth() { if (month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1); setSelectedDay(null) }
  function nextMonth() { if (month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1); setSelectedDay(null) }
  function goToday()   { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(toYMD(today)) }

  async function handleSync() {
    setSyncing(true)
    try {
      const { error } = await supabase.functions.invoke('google-calendar-sync')
      if (error) throw error
      queryClient.invalidateQueries({ queryKey:['calendar-events'] })
      queryClient.invalidateQueries({ queryKey:['google-integration'] })
      toast('Calendar synced', 'success')
    } catch(err) { toast('Sync failed: ' + err.message, 'error')
    } finally { setSyncing(false) }
  }

  const todayYMD      = toYMD(today)
  const selectedItems = selectedDay ? (dayMap[selectedDay] ?? { leads:[], events:[] }) : null

  const actions = (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      {isManager && (
        <select className="crm-input" style={{ fontSize:'12px', width:'140px' }} value={repFilter} onChange={e => setRepFilter(e.target.value)}>
          <option value="">All reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
      )}
      <button className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>
      {googleConnected && (
        <button className="btn btn-ghost btn-sm" onClick={handleSync} disabled={syncing} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          <RefreshCw size={13} style={syncing?{animation:'spin 1s linear infinite'}:{}} />{syncing?'Syncing...':'Sync'}
        </button>
      )}
      <button className="btn btn-primary btn-sm" onClick={()=>setAddEventOpen(true)} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
        <Plus size={14} />New Event
      </button>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <TopBar title={t('nav.calendar')} actions={actions} />
      {!googleConnected && (
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 20px', background:'rgba(251,191,36,0.08)', borderBottom:'1px solid rgba(251,191,36,0.25)' }}>
          <AlertCircle size={15} style={{ color:'#f59e0b', flexShrink:0 }} />
          <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Google Calendar is not connected - events will not sync automatically.</span>
          <button className="btn btn-ghost btn-xs" style={{ marginLeft:'auto', color:'#f59e0b', border:'1px solid #f59e0b44' }} onClick={()=>navigate('/settings?section=google')}>Connect</button>
        </div>
      )}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', padding:'0 16px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0 12px' }}>
            <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span style={{ fontSize:'16px', fontWeight:700, color:'var(--text-primary)' }}>{MONTH_NAMES[month]} {year}</span>
            <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', borderBottom:'1px solid var(--border-default)', marginBottom:'1px' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ padding:'6px 0', textAlign:'center', fontSize:'11px', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{d}</div>
            ))}
          </div>
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gridTemplateRows:'repeat(6, 1fr)', gap:'1px', background:'var(--border-default)', overflow:'hidden', borderRadius:'6px' }}>
            {gridDays.map(day => {
              const ymd        = toYMD(day)
              const isToday    = ymd === todayYMD
              const isSelected = ymd === selectedDay
              const inMonth    = day.getMonth() === month
              const items      = dayMap[ymd]
              return (
                <div key={ymd} onClick={() => setSelectedDay(ymd===selectedDay?null:ymd)}
                  style={{ background: isSelected?'rgba(34,211,238,0.08)':isToday?'rgba(34,197,94,0.06)':'var(--bg-card)', padding:'6px 7px', cursor:'pointer', display:'flex', flexDirection:'column', gap:'3px',
                    outline: isSelected?'2px solid var(--brand-cyan)':isToday?'2px solid #22c55e44':'none', outlineOffset:'-2px', borderRadius:'2px', minHeight:0, overflow:'hidden' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background=isSelected?'rgba(34,211,238,0.08)':isToday?'rgba(34,197,94,0.06)':'var(--bg-card)' }}>
                  <div style={{ fontSize:'12px', fontWeight:isToday?700:500, color:isToday?'#22c55e':inMonth?'var(--text-primary)':'var(--text-muted)', lineHeight:1 }}>{day.getDate()}</div>
                  {items && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'2px', flex:1, overflow:'hidden' }}>
                      {items.events.slice(0,2).map(ev => (
                        <div key={ev.id} style={{ fontSize:'10px', fontWeight:600, lineHeight:1.2, padding:'1px 4px', borderRadius:'3px', background:(EVENT_TYPE_COLORS[ev.event_type]??'#64748b')+'22', color:EVENT_TYPE_COLORS[ev.event_type]??'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</div>
                      ))}
                      {items.leads.slice(0,3).map(lead => (
                        <div key={lead.id} style={{ fontSize:'10px', lineHeight:1.2, padding:'1px 4px', borderRadius:'3px', background:(STAGE_COLORS[lead.stage]??'#64748b')+'18', color:STAGE_COLORS[lead.stage]??'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.company_name}</div>
                      ))}
                      {(items.leads.length+items.events.length)>5 && <div style={{ fontSize:'10px', color:'var(--text-muted)', paddingLeft:'4px' }}>+{items.leads.length+items.events.length-5} more</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {selectedDay && selectedItems && (
          <div style={{ width:'300px', flexShrink:0, borderLeft:'1px solid var(--border-default)', display:'flex', flexDirection:'column', background:'var(--bg-surface)' }}>
            <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'14px', color:'var(--text-primary)' }}>
                  {new Date(selectedDay+'T12:00:00').toLocaleDateString(lang==='ar'?'ar-EG':'en-GB',{weekday:'long',day:'numeric',month:'long'})}
                </div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>
                  {selectedItems.leads.length+selectedItems.events.length} item{selectedItems.leads.length+selectedItems.events.length!==1?'s':''}
                </div>
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                <button className="btn btn-ghost btn-icon" onClick={()=>setAddEventOpen(true)}><Plus size={14} /></button>
                <button className="btn btn-ghost btn-icon" onClick={()=>setSelectedDay(null)}><X size={14} /></button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
              {selectedItems.events.length > 0 && (
                <div style={{ marginBottom:'14px' }}>
                  <SectionLabel>Events</SectionLabel>
                  {selectedItems.events.map(ev => {
                    const color   = EVENT_TYPE_COLORS[ev.event_type] ?? '#64748b'
                    const timeStr = new Date(ev.starts_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
                    return (
                      <div key={ev.id} style={{ padding:'9px 11px', borderRadius:'7px', marginBottom:'6px', background:'var(--bg-card)', border:'1px solid var(--border-default)', borderLeft:'3px solid ' + color }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
                          <CalIcon size={11} color={color} />
                          <span style={{ fontSize:'12px', fontWeight:600, color:'var(--text-primary)' }}>{ev.title}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'var(--text-muted)' }}>
                          <Clock size={10} />{timeStr}
                          <span style={{ marginLeft:'4px', fontSize:'10px', fontWeight:600, padding:'1px 5px', borderRadius:'3px', background:color+'22', color }}>{EVENT_TYPE_LABELS[ev.event_type]??ev.event_type}</span>
                        </div>
                        {ev.leads?.company_name && <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'3px' }}>{ev.leads.company_name}</div>}
                        {ev.location && <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{ev.location}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedItems.leads.length > 0 && (
                <div>
                  <SectionLabel>Next Actions</SectionLabel>
                  {selectedItems.leads.map(lead => {
                    const color = STAGE_COLORS[lead.stage] ?? '#64748b'
                    return (
                      <div key={lead.id} onClick={()=>setLeadPanelId(lead.id)}
                        style={{ padding:'9px 11px', borderRadius:'7px', marginBottom:'6px', background:'var(--bg-card)', border:'1px solid var(--border-default)', borderLeft:'3px solid ' + color, cursor:'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background='var(--bg-card)'}>
                        <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text-primary)', marginBottom:'2px' }}>{lead.company_name}</div>
                        {lead.next_action && <div style={{ fontSize:'11px', color:'var(--text-secondary)', marginBottom:'3px' }}>{lead.next_action}</div>}
                        <div style={{ display:'flex', gap:'8px' }}>
                          {lead.contact_name && <span style={{ fontSize:'10px', color:'var(--text-muted)' }}>{lead.contact_name}</span>}
                          {isManager && lead.profiles?.full_name && <span style={{ fontSize:'10px', color:'var(--text-muted)' }}>Rep: {lead.profiles.full_name}</span>}
                          <span style={{ fontSize:'10px', fontWeight:600, padding:'0 4px', borderRadius:'3px', background:color+'22', color }}>{t('stage.' + lead.stage)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedItems.leads.length===0 && selectedItems.events.length===0 && (
                <div style={{ padding:'24px 0', textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>Nothing scheduled</div>
              )}
            </div>
          </div>
        )}
      </div>

      {leadPanelId && <LeadPanel leadId={leadPanelId} onClose={()=>setLeadPanelId(null)} />}
      <AddEventModal open={addEventOpen} onClose={()=>setAddEventOpen(false)} defaultDate={selectedDay} />
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:'7px', paddingBottom:'5px', borderBottom:'1px solid var(--border-default)' }}>
      {children}
    </div>
  )
}
