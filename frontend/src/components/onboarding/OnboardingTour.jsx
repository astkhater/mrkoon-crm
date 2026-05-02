/**
 * OnboardingTour — role-scoped first-login walkthrough
 * Triggered on first login (localStorage flag) or from Help button.
 * Props: onClose, role
 */
import { useState } from 'react'
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

const STEPS = {
  cco: [
    { title: 'Welcome, CCO 👋', body: "You have full visibility across all reps, leads, and accounts. This tour covers your key workflows.", icon: '🛡️' },
    { title: 'CCO Dashboard', body: "Your dashboard shows team KPIs, rep performance, stage breakdown, and overdue actions at a glance.", icon: '📊', highlight: '/dashboard/cco' },
    { title: 'Pipeline View', body: "Use the Kanban board to see all leads by stage. Filter by rep or entity. Drag is not available yet — change stages from the lead panel.", icon: '🏗️', highlight: '/pipeline' },
    { title: 'Leads Table', body: "Search by company name, contact name, or phone. Filter by stage, source, entity, or rep. Click any row to open the lead detail panel.", icon: '👥', highlight: '/leads' },
    { title: 'Import Leads', body: "Upload a CSV to bulk-import leads. The system checks for duplicates by company name. Map columns on upload.", icon: '📤', highlight: '/import' },
    { title: 'Ask AI', body: "Use the AI assistant for pipeline summaries, draft messages, or analysis. Set your AI key in settings first.", icon: '✨', highlight: '/ask-ai' },
  ],
  ceo: [
    { title: 'Welcome, CEO 👋', body: "You have holding-level visibility across Egypt and KSA. This tour covers your key dashboards and controls.", icon: '🌐' },
    { title: 'Holding Dashboard', body: "Switch between EG, KSA, and Holding views using the toggle in the left sidebar. Holding shows both markets side-by-side.", icon: '📊', highlight: '/dashboard/executive' },
    { title: 'BD Working Mode', body: "Click 'Work as BD' in the sidebar to switch into a rep-style view for your own leads. Your executive access is preserved — click 'Exit BD Mode' to return.", icon: '💼' },
    { title: 'Pipeline & Leads', body: "Full visibility across all pipeline stages and all reps for whichever entity you've selected.", icon: '🏗️', highlight: '/pipeline' },
    { title: 'Ask AI', body: "Use AI for market summaries, competitive analysis, or drafting comms. Set your AI key in Settings.", icon: '✨', highlight: '/ask-ai' },
  ],
  coo: [
    { title: 'Welcome, COO 👋', body: "You have full operational visibility across both markets. This tour covers your dashboards and working modes.", icon: '⚙️' },
    { title: 'Executive Dashboard', body: "Switch between Egypt, KSA, and Holding using the entity toggle in the sidebar. Each view shows KPIs and team performance.", icon: '📊', highlight: '/dashboard/executive' },
    { title: 'BD Working Mode', body: "Toggle 'Work as BD' to use the CRM as a rep — useful for your own deals. Click 'Exit BD Mode' to return to executive view.", icon: '💼' },
    { title: 'Accounts', body: "Accounts lists all active clients. Use it to track renewals and monitor account health.", icon: '🏢', highlight: '/accounts' },
  ],
  bd_tl: [
    { title: 'Welcome, Team Lead 👋', body: "You have visibility across your team's leads and can manage rep performance. This tour covers your key pages.", icon: '👑' },
    { title: 'CCO Dashboard', body: "Your dashboard shows team performance, stage breakdown, and overdue actions for your reps.", icon: '📊', highlight: '/dashboard/cco' },
    { title: 'Pipeline', body: "See all team leads on the Kanban. Use the rep filter dropdown to focus on one rep at a time.", icon: '🏗️', highlight: '/pipeline' },
    { title: 'Reconnect Queue', body: "Leads that have gone cold or need follow-up. Review daily and push reps to re-engage.", icon: '🔁', highlight: '/reconnect' },
  ],
  bd_rep: [
    { title: 'Welcome to Mrkoon CRM 👋', body: "This is your home for managing leads, tracking pipeline progress, and logging every interaction.", icon: '🚀' },
    { title: 'Your Dashboard', body: "See your pipeline at a glance — total leads, active stages, next actions due today, and recent activity.", icon: '📊', highlight: '/dashboard/bd' },
    { title: 'Pipeline Board', body: "Drag leads through stages as you progress. Click any card to log a call, note, or meeting, and update the next action.", icon: '🏗️', highlight: '/pipeline' },
    { title: 'Logging Activities', body: "Every call, meeting, and WhatsApp should be logged. Open the lead panel → Log Activity. This builds your history and triggers reconnect reminders.", icon: '📝' },
    { title: 'Reconnect Queue', body: "Leads you haven't touched in a while appear here. Work through this queue daily to keep your pipeline alive.", icon: '🔁', highlight: '/reconnect' },
    { title: 'Calendar', body: "Schedule meetings and set next action dates on leads. Sync with Google Calendar in Settings.", icon: '📅', highlight: '/calendar' },
  ],
  bd_am: [
    { title: 'Welcome, Account Manager 👋', body: "Your focus is client retention and renewals. This tour covers the pages you'll use most.", icon: '🤝' },
    { title: 'AM Dashboard', body: "Your dashboard shows active clients, upcoming renewals, and accounts needing attention.", icon: '📊', highlight: '/dashboard/am' },
    { title: 'Accounts', body: "All your active clients in one place. Click any account to view history, log interactions, and track renewal status.", icon: '🏢', highlight: '/accounts' },
    { title: 'Reconnect Queue', body: "Clients who haven't been contacted recently. Review daily — proactive outreach prevents churn.", icon: '🔁', highlight: '/reconnect' },
    { title: 'Calendar', body: "Schedule QBRs, renewal calls, and client check-ins. All meeting notes are logged to the account.", icon: '📅', highlight: '/calendar' },
  ],
}

export default function OnboardingTour({ role, onClose }) {
  const steps = STEPS[role] ?? STEPS['bd_rep']
  const [step, setStep] = useState(0)
  const current  = steps[step]
  const isLast   = step === steps.length - 1
  const progress = ((step + 1) / steps.length) * 100

  function finish() {
    localStorage.setItem('crm_onboarding_done', '1')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={finish}
        style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      />

      {/* Card */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 91,
        width: '440px', maxWidth: '90vw',
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--bg-elevated)' }}>
          <div style={{
            height: '3px', width: `${progress}%`,
            background: 'var(--brand-green)',
            transition: 'width .3s ease',
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Step {step + 1} of {steps.length}
          </div>
          <button onClick={finish} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 24px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>{current.icon}</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.3 }}>
            {current.title}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            {current.body}
          </p>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="btn btn-ghost btn-sm"
              style={{ opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
            >
              <ArrowLeft size={13} /> Back
            </button>

            {/* Dots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    width: i === step ? '18px' : '7px',
                    height: '7px',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    background: i === step ? 'var(--brand-green)' : 'var(--border)',
                    transition: 'all .2s',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            {isLast ? (
              <button onClick={finish} className="btn btn-primary btn-sm">
                <CheckCircle size={13} /> Done
              </button>
            ) : (
              <button onClick={() => setStep(s => s + 1)} className="btn btn-primary btn-sm">
                Next <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}