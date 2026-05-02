import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Shield, Users, Eye, Plug, RefreshCw, Check, ClipboardList } from 'lucide-react'

const ROLE_OPTIONS = ['cco','ceo','coo','bd_tl','bd_rep','bd_am']
const ROLE_LABELS  = { cco:'CCO', ceo:'CEO', coo:'COO', bd_tl:'BD Team Lead', bd_rep:'BD Rep', bd_am:'Account Manager' }

const SOURCE_CARDS = [
  { id:'erp',     label:'ERP Connector',   icon:'\u{1F517}', status:'dormant', desc:'Internal ERP — activate with credentials' },
  { id:'meta',    label:'Meta Ads',         icon:'\u{1F4D8}', status:'planned', desc:'Lead source from Meta (Facebook/Instagram) campaigns' },
  { id:'linkedin',label:'LinkedIn Ads',     icon:'\u{1F4BC}', status:'planned', desc:'Lead source from LinkedIn campaign manager' },
  { id:'google',  label:'Google Ads',       icon:'\u{1F50D}', status:'planned', desc:'Lead source from Google Ads' },
  { id:'import',  label:'Manual Import',    icon:'\u{1F4E4}', status:'active',  desc:'CSV import — currently active on /import page' },
]

const ACTION_COLORS = {
  created:        { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80' },
  updated:        { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  stage_change:   { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  deleted:        { bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
  profile_update: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
}

const AUDIT_PAGE_SIZE = 50

export default function AdminPanel() {
  const { isAdmin } = useAuth()
  const [tab,         setTab]         = useState('users')
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(null)
  const [previewRole, setPreviewRole] = useState(null)
  const [auditLogs,   setAuditLogs]   = useState([])
  const [auditLoading,setAuditLoading]= useState(false)
  const [auditFilter, setAuditFilter] = useState('')
  const [auditPage,   setAuditPage]   = useState(0)

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
  }, [isAdmin])

  const loadAuditLog = useCallback(async () => {
    setAuditLoading(true)
    let q = supabase
      .from('audit_log')
      .select('id, action, entity_type, summary, created_at, profiles:user_id(full_name)')
      .order('created_at', { ascending: false })
      .range(auditPage * AUDIT_PAGE_SIZE, (auditPage + 1) * AUDIT_PAGE_SIZE - 1)
    if (auditFilter) q = q.eq('action', auditFilter)
    const { data } = await q
    setAuditLogs(data ?? [])
    setAuditLoading(false)
  }, [auditFilter, auditPage])

  useEffect(() => {
    if (tab === 'audit' && isAdmin) loadAuditLog()
  }, [tab, loadAuditLog])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_admin')
      .order('full_name')
    setUsers(data ?? [])
    setLoading(false)
  }

  async function updateRole(uid, newRole) {
    setSaving(uid)
    await supabase.from('profiles').update({ role: newRole }).eq('id', uid)
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u))
    setSaving(null)
  }

  async function toggleAdmin(uid, current) {
    setSaving(uid)
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', uid)
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, is_admin: !current } : u))
    setSaving(null)
  }

  if (!isAdmin) return (
    <div className="page-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ color:'var(--danger)', fontSize:'14px' }}>Access denied. Admin only.</div>
    </div>
  )

  const tabs = [
    { id:'users',   label:'Users',        icon: Users },
    { id:'preview', label:'Role Preview', icon: Eye },
    { id:'sources', label:'Integrations', icon: Plug },
    { id:'audit',   label:'Audit Log',    icon: ClipboardList },
  ]

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <Shield size={20} style={{ color:'var(--brand-green)' }} />
            Admin Panel
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:'13px', marginTop:'2px' }}>User management, role control, integrations, audit log</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'24px', borderBottom:'1px solid var(--border)', paddingBottom:'0' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding:'8px 16px', fontSize:'13px', fontWeight:600,
              background:'none', border:'none', cursor:'pointer',
              color: tab === t.id ? 'var(--brand-green)' : 'var(--text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--brand-green)' : '2px solid transparent',
              display:'flex', alignItems:'center', gap:'6px',
              marginBottom:'-1px',
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="crm-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, color:'var(--text-primary)' }}>All Users ({users.length})</div>
            <button onClick={loadUsers} className="btn btn-ghost btn-sm">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
          {loading ? (
            <div style={{ padding:'32px', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr>
                  {['Name','Role','Admin','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', background:'var(--bg-base)', color:'var(--text-muted)', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 16px', color:'var(--text-primary)', fontWeight:600 }}>{u.full_name}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} disabled={saving === u.id} className="crm-input" style={{ width:'auto', minWidth:'160px', padding:'4px 8px', fontSize:'12px' }}>
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <button onClick={() => toggleAdmin(u.id, u.is_admin)} disabled={saving === u.id}
                        style={{ width:'32px', height:'20px', borderRadius:'10px', border:'none', cursor:'pointer', background: u.is_admin ? 'var(--brand-green)' : 'var(--border)', position:'relative', transition:'background .2s' }}
                        title={u.is_admin ? 'Remove admin' : 'Grant admin'}>
                        <span style={{ position:'absolute', top:'2px', left: u.is_admin ? '14px' : '2px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left .2s', display:'block' }} />
                      </button>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {saving === u.id
                        ? <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>Saving…</span>
                        : <span style={{ fontSize:'11px', color:'var(--brand-green)' }}>Active</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', fontSize:'12px', color:'var(--text-muted)' }}>
            To create new users: Supabase dashboard → Authentication → Users → Invite user, then set role here.
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="crm-card" style={{ padding:'24px' }}>
          <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:'8px' }}>Preview Role View</div>
          <div style={{ color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px' }}>See how the app looks for each role. Your admin access is unaffected.</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
            {ROLE_OPTIONS.map(r => (
              <button key={r} onClick={() => { setPreviewRole(r === previewRole ? null : r); localStorage.setItem('crm_preview_role', r === previewRole ? '' : r); window.location.href = '/' }}
                style={{ padding:'14px', borderRadius:'8px', border:'1px solid', cursor:'pointer', textAlign:'left', background: previewRole === r ? 'rgba(34,197,94,0.1)' : 'var(--bg-elevated)', borderColor: previewRole === r ? 'var(--brand-green)' : 'var(--border)', color: 'var(--text-primary)' }}>
                <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'4px' }}>{ROLE_LABELS[r]}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{r}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop:'16px', padding:'12px', background:'var(--bg-elevated)', borderRadius:'8px', fontSize:'12px', color:'var(--text-muted)' }}>
            Note: Redirects to home with selected role's navigation. Refresh to exit preview.
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <div>
          <div style={{ color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px' }}>Manage data source connections. Active sources feed leads directly into the CRM.</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            {SOURCE_CARDS.map(s => (
              <div key={s.id} className="crm-card" style={{ padding:'20px', display:'flex', gap:'14px', alignItems:'flex-start' }}>
                <div style={{ fontSize:'28px', flexShrink:0 }}>{s.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:'4px', display:'flex', alignItems:'center', gap:'8px' }}>
                    {s.label}
                    <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'999px',
                      background: s.status==='active' ? 'rgba(34,197,94,0.15)' : s.status==='dormant' ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
                      color: s.status==='active' ? '#4ade80' : s.status==='dormant' ? '#fbbf24' : '#94a3b8' }}>
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'12px' }}>{s.desc}</div>
                  {s.status === 'dormant' && <button className="btn btn-secondary btn-sm" disabled>Activate (provide credentials)</button>}
                  {s.status === 'planned' && <button className="btn btn-ghost btn-sm" disabled>Coming soon</button>}
                  {s.status === 'active'  && <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#4ade80' }}><Check size={13} /> Connected</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px', alignItems:'center' }}>
            <select value={auditFilter} onChange={e => { setAuditFilter(e.target.value); setAuditPage(0) }} className="crm-input" style={{ fontSize:'12px', width:'180px' }}>
              <option value="">All actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="stage_change">Stage Changes</option>
              <option value="deleted">Deleted</option>
              <option value="profile_update">Profile Updates</option>
            </select>
            <button onClick={loadAuditLog} className="btn btn-ghost btn-sm"><RefreshCw size={13} /> Refresh</button>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'var(--text-muted)' }}>
              <span>Page {auditPage + 1}</span>
              <button onClick={() => setAuditPage(p => Math.max(0, p-1))} disabled={auditPage===0} className="btn btn-ghost btn-sm">←</button>
              <button onClick={() => setAuditPage(p => p+1)} disabled={auditLogs.length < AUDIT_PAGE_SIZE} className="btn btn-ghost btn-sm">→</button>
            </div>
          </div>
          <div className="crm-card" style={{ padding:0, overflow:'hidden' }}>
            {auditLoading ? (
              <div style={{ padding:'32px', textAlign:'center', color:'var(--text-muted)' }}>Loading…</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>No audit entries yet. Entries appear automatically when leads or profiles are modified.</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                <thead>
                  <tr>
                    {['Time','Action','User','Summary'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', background:'var(--bg-base)', color:'var(--text-muted)', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => {
                    const c = ACTION_COLORS[log.action] ?? { bg:'rgba(100,116,139,0.12)', color:'#94a3b8' }
                    const d = new Date(log.created_at)
                    return (
                      <tr key={log.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'10px 14px', color:'var(--text-muted)', whiteSpace:'nowrap', fontSize:'11px' }}>
                          {d.toLocaleDateString()} {d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'999px', background:c.bg, color:c.color }}>
                            {log.action.replace(/_/g,' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{log.profiles?.full_name ?? '—'}</td>
                        <td style={{ padding:'10px 14px', color:'var(--text-primary)', maxWidth:'400px' }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.summary ?? '—'}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
