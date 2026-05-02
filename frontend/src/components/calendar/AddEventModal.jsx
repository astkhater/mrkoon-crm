import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, FileText, Users, Tag } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useApp }  from '../../contexts/AppContext'

const EVENT_TYPES = [
  { value: 'meeting_onsite',  label: 'Meeting (On-site)' },
  { value: 'meeting_online',  label: 'Meeting (Online)'  },
  { value: 'call',            label: 'Call'              },
  { value: 'site_visit',      label: 'Site Visit'        },
  { value: 'follow_up',       label: 'Follow-up'        },
  { value: 'other',           label: 'Other'             },
]

function todayAt(hour = 10) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d
}

function toLocalDatetimeValue(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateValue(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}

export default function AddEventModal({ open, onClose, defaultDate }) {
  const { userId } = useAuth()
  const { t, toast } = useApp()
  const queryClient  = useQueryClient()
  const [form, setForm] = useState(() => buildDefaultForm(defaultDate))

  useEffect(() => {
    if (open) setForm(buildDefaultForm(defaultDate))
  }, [open, defaultDate])

  function buildDefaultForm(date) {
    const base = date ? new Date(`${date}T10:00:00`) : todayAt(10)
    const end  = new Date(base.getTime() + 60 * 60 * 1000)
    return {
      title:      '',
      event_type: 'meeting_onsite',
      starts_at:  toLocalDatetimeValue(base),
      ends_at:    toLocalDatetimeValue(end),
      location:   '',
      notes:      '',
      attendees:  '',
    }
  }

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'starts_at') {
        const s = new Date(value)
        const e = new Date(next.ends_at)
        if (e <= s) {
          const autoEnd = new Date(s.getTime() + 60 * 60 * 1000)
          next.ends_at = toLocalDatetimeValue(autoEnd)
        }
      }
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Title is required')
      if (!form.starts_at)   throw new Error('Start time is required')
      if (!form.ends_at)     throw new Error('End time is required')
      const startsUtc = new Date(form.starts_at).toISOString()
      const endsUtc   = new Date(form.ends_at).toISOString()
      if (new Date(endsUtc) <= new Date(startsUtc)) throw new Error('End time must be after start time')
      const attendeeList = form.attendees.split(',').map(s => s.trim()).filter(s => s.length > 0)
      const { data: inserted, error } = await supabase
        .from('calendar_events')
        .insert({
          created_by:  userId,
          title:       form.title.trim(),
          event_type:  form.event_type,
          starts_at:   startsUtc,
          ends_at:     endsUtc,
          location:    form.location.trim() || null,
          notes:       form.notes.trim()    || null,
          attendees:   attendeeList.length ? attendeeList : null,
          sync_status: 'pending',
        })
        .select('id').single()
      if (error) throw error
      supabase.functions.invoke('google-calendar-push', { body: { event_id: inserted.id } })
        .catch(() => {})
      return inserted.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast('Event created', 'success')
      onClose()
    },
    onError: (err) => { toast(err.message, 'error') },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: 'var(--brand-cyan)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>New Event</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={mutation.isPending}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="crm-label" htmlFor="ev-title">Title *</label>
            <input id="ev-title" className="crm-input" placeholder="e.g. Client meeting with Al-Haramain"
              value={form.title} onChange={e => set('title', e.target.value)} disabled={mutation.isPending} autoFocus />
          </div>
          <div>
            <label className="crm-label" htmlFor="ev-type">Event Type</label>
            <select id="ev-type" className="crm-input" value={form.event_type}
              onChange={e => set('event_type', e.target.value)} disabled={mutation.isPending}>
              {EVENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="crm-label" htmlFor="ev-start">Start *</label>
              <input id="ev-start" type="datetime-local" className="crm-input" value={form.starts_at}
                onChange={e => set('starts_at', e.target.value)} disabled={mutation.isPending} />
            </div>
            <div>
              <label className="crm-label" htmlFor="ev-end">End *</label>
              <input id="ev-end" type="datetime-local" className="crm-input" value={form.ends_at}
                onChange={e => set('ends_at', e.target.value)} disabled={mutation.isPending} />
            </div>
          </div>
          <div>
            <label className="crm-label" htmlFor="ev-location">Location</label>
            <input id="ev-location" className="crm-input" placeholder="Address or meeting link"
              value={form.location} onChange={e => set('location', e.target.value)} disabled={mutation.isPending} />
          </div>
          <div>
            <label className="crm-label" htmlFor="ev-attendees">Attendees (emails, comma-separated)</label>
            <input id="ev-attendees" className="crm-input" placeholder="ahmed@example.com, sara@example.com"
              value={form.attendees} onChange={e => set('attendees', e.target.value)} disabled={mutation.isPending} />
          </div>
          <div>
            <label className="crm-label" htmlFor="ev-notes">Notes</label>
            <textarea id="ev-notes" className="crm-input" rows={3} placeholder="Agenda, context, or any details…"
              value={form.notes} onChange={e => set('notes', e.target.value)} disabled={mutation.isPending}
              style={{ resize: 'vertical', minHeight: 72 }} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border-default)' }}>
          <button className="btn btn-secondary btn-md" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title.trim()}>
            {mutation.isPending ? 'Saving…' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}