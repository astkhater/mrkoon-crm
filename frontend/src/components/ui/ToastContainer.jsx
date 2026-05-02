import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const Icon = ICONS[toast.type] ?? Info
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon size={15} style={{ flexShrink: 0 }} />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.6 }}
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}