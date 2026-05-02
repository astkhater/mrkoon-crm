import { useNavigate } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'

export default function NotFound() {
  const { t } = useApp()
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: 'var(--bg-base)',
    }}>
      <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '-2px' }}>
        404
      </div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
        Page not found
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        The page you're looking for doesn't exist.
      </div>
      <button
        onClick={() => navigate('/', { replace: true })}
        className="btn btn-primary btn-md"
        style={{ marginTop: '8px' }}
      >
        Go home
      </button>
    </div>
  )
}