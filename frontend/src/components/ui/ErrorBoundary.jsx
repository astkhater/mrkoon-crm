/**
 * ErrorBoundary — catches any React crash, logs it to Supabase error_logs,
 * and shows a recovery UI instead of a blank screen.
 */
import { Component } from 'react'
import { supabase }  from '@/lib/supabase'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Silent log to Supabase — don't block UI recovery
    supabase.from('error_logs').insert({
      error_message: error?.message ?? String(error),
      error_stack:   error?.stack   ?? null,
      component_stack: info?.componentStack ?? null,
      url: window.location.href,
    }).then(() => {}).catch(() => {})
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '32px', background: 'var(--bg-base)',
      }}>
        <div style={{
          maxWidth: '420px', textAlign: 'center',
          padding: '32px', borderRadius: '12px',
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.6 }}>
            This error has been automatically logged. The team has been notified.
          </div>
          {this.state.error?.message && (
            <div style={{
              fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)',
              background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px',
              marginBottom: '20px', textAlign: 'left', wordBreak: 'break-all',
            }}>
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
              background: 'var(--brand-green)', color: '#fff', border: 'none',
              fontSize: '13px', fontWeight: 700,
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
