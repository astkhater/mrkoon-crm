/**
 * LeadContacts — multiple contacts per lead
 * Displays list of contacts, allows add / edit / delete / set primary
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Star, Phone, Mail, User, Edit2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/contexts/AuthContext'
import { useApp }   from '@/contexts/AppContext'

const EMPTY_FORM = { name: '', title: '', phone: '', email: '' }

function ContactCard({ contact, onDelete, onSetPrimary, onEdit, canEdit, canDelete }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: '8px',
      background: contact.is_primary ? 'rgba(34,211,238,0.06)' : 'var(--bg-elevated)',
      border: `1px solid ${contact.is_primary ? 'rgba(34,211,238,0.25)' : 'var(--border-subtle)'}`,
      marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {contact.name}
            </span>
            {contact.is_primary && (
              <span style={{
                fontSize: '9px', padding: '1px 6px', borderRadius: '4px',
                background: 'rgba(34,211,238,0.15)', color: 'var(--brand-cyan)',
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
              }}>Primary</span>
            )}
          </div>
          {contact.title && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              {contact.title}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {contact.phone && (
              <a href={`tel:${contact.phone}`} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                <Phone size={10} /> {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                <Mail size={10} /> {contact.email}
              </a>
            )}
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            {!contact.is_primary && (
              <button
                onClick={() => onSetPrimary(contact.id)}
                className="btn btn-ghost btn-icon"
                style={{ padding: '3px', opacity: 0.5 }}
                title="Set as primary"
              >
                <Star size={11} />
              </button>
            )}
            <button
              onClick={() => onEdit(contact)}
              className="btn btn-ghost btn-icon"
              style={{ padding: '3px', opacity: 0.5 }}
              title="Edit"
            >
              <Edit2 size={11} />
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(contact.id)}
                className="btn btn-ghost btn-icon"
                style={{ padding: '3px', opacity: 0.4 }}
                title="Delete contact"
              >
                <X size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LeadContacts({ leadId }) {
  const { isManager, profile } = useAuth()
  const { toast }              = useApp()
  const queryClient            = useQueryClient()

  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState(null) // contact object being edited
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['lead-contacts', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_contacts')
        .select('*')
        .eq('lead_id', leadId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!leadId,
  })

  const canEdit   = !!profile                        // any logged-in user (RLS enforces per-lead access)
  const canDelete = isManager || !!profile?.is_admin  // managers + admins only

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setAdding(true)
  }

  function openEdit(contact) {
    setEditing(contact)
    setForm({ name: contact.name, title: contact.title ?? '', phone: contact.phone ?? '', email: contact.email ?? '' })
    setAdding(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    if (editing) {
      const { error } = await supabase
        .from('lead_contacts')
        .update({ name: form.name.trim(), title: form.title.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null })
        .eq('id', editing.id)
      if (error) toast({ type: 'error', message: error.message })
    } else {
      const isPrimary = contacts.length === 0
      const { error } = await supabase
        .from('lead_contacts')
        .insert({ lead_id: leadId, name: form.name.trim(), title: form.title.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null, is_primary: isPrimary })
      if (error) toast({ type: 'error', message: error.message })
    }
    setSaving(false)
    setAdding(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    queryClient.invalidateQueries({ queryKey: ['lead-contacts', leadId] })
  }

  async function handleDelete(id) {
    await supabase.from('lead_contacts').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['lead-contacts', leadId] })
  }

  async function handleSetPrimary(id) {
    // Clear all primary flags then set new one
    await supabase.from('lead_contacts').update({ is_primary: false }).eq('lead_id', leadId)
    await supabase.from('lead_contacts').update({ is_primary: true }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['lead-contacts', leadId] })
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Contacts {!isLoading && contacts.length > 0 && <span style={{ fontWeight: 400 }}>({contacts.length})</span>}
        </div>
        <button
          onClick={adding ? () => { setAdding(false); setEditing(null) } : openAdd}
          className="btn btn-ghost btn-xs"
          style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
        >
          {adding ? <X size={11} /> : <Plus size={11} />}
          {adding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add / Edit form */}
      {adding && (
        <form onSubmit={handleSave} style={{
          background: 'var(--bg-elevated)', borderRadius: '8px',
          padding: '12px', marginBottom: '8px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Name *</label>
              <input className="crm-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" style={{ width: '100%' }} autoFocus required />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Title</label>
              <input className="crm-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Job title" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Phone</label>
              <input className="crm-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01xxxxxxxxx" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Email</label>
              <input className="crm-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com" style={{ width: '100%' }} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !form.name.trim()}>
            {saving ? 'Saving...' : editing ? 'Update contact' : 'Add contact'}
          </button>
        </form>
      )}

      {/* Contact list */}
      {isLoading ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>Loading...</div>
      ) : contacts.length === 0 && !adding ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 0', fontStyle: 'italic' }}>No contacts added yet</div>
      ) : (
        contacts.map(c => (
          <ContactCard
            key={c.id}
            contact={c}
            canEdit={canEdit}
            canDelete={canDelete}
            onDelete={handleDelete}
            onSetPrimary={handleSetPrimary}
            onEdit={openEdit}
          />
        ))
      )}
    </div>
  )
}
