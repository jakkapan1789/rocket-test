import { useState, useEffect } from 'react'

const ICONS = {
  success: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,7 5.5,10.5 12,3.5"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.5"/><line x1="7" y1="6" x2="7" y2="10"/><circle cx="7" cy="4" r="0.5" fill="currentColor"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.5L13 12H1L7 1.5z"/><line x1="7" y1="5.5" x2="7" y2="8.5"/><circle cx="7" cy="10.5" r="0.5" fill="currentColor"/>
    </svg>
  ),
}

const DURATION = 3000
const ANIM_OUT = 280

function Toast({ toast, onDismiss }) {
  const [out, setOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => {
      setOut(true)
      setTimeout(onDismiss, ANIM_OUT)
    }, DURATION)
    return () => clearTimeout(t1)
  }, [onDismiss])

  const dismiss = () => {
    setOut(true)
    setTimeout(onDismiss, ANIM_OUT)
  }

  return (
    <div className={`toast toast-${toast.type}${out ? ' toast-out' : ' toast-in'}`}>
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={dismiss} aria-label="Dismiss">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
        </svg>
      </button>
      <div className="toast-progress">
        <div className="toast-progress-fill" style={{ animationDuration: `${DURATION}ms` }} />
      </div>
    </div>
  )
}

export default function Toaster({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="toaster">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}
