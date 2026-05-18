import { useState, useRef, useEffect } from 'react'

export default function SimpleSelect({ value, onChange, options = [], disabled = false, placeholder = '' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt) => {
    if (disabled) return
    onChange(opt.value)
    setOpen(false)
  }

  return (
    <div className={`ss-wrap${disabled ? ' ss-disabled' : ''}`} ref={wrapRef}>
      <button
        className="ss-btn"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className="ss-btn-label">{selected?.label ?? placeholder}</span>
        <svg
          className={`ss-chevron${open ? ' open' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="currentColor"
        >
          <path d="M0 0l5 6 5-6z"/>
        </svg>
      </button>

      {open && (
        <div className="ss-menu">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`ss-item${opt.value === value ? ' active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
