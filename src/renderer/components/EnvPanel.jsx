import { useState, useCallback, useRef } from 'react'

const PANE_WIDTH_KEY = 'rocket_env_pane_width'

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--vsc-sidebar)', border: '1px solid var(--vsc-border)',
          borderRadius: 8, padding: '24px 28px', minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--vsc-text)', marginBottom: 20, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 16px', borderRadius: 5, border: '1px solid var(--vsc-border)',
              background: 'none', color: 'var(--vsc-text)', cursor: 'pointer', fontSize: 12,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--vsc-list-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '6px 16px', borderRadius: 5, border: 'none',
              background: '#c72e2e', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e03535'}
            onMouseLeave={e => e.currentTarget.style.background = '#c72e2e'}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EnvPanel({ envConfig, onChange }) {
  const { activeId, environments } = envConfig
  const [selectedId, setSelectedId] = useState(() => activeId || environments[0]?.id || null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // env id to delete

  const [paneWidth, setPaneWidth] = useState(() => {
    const saved = localStorage.getItem(PANE_WIDTH_KEY)
    return saved ? parseInt(saved, 10) : 220
  })
  const dragging = useRef(false)

  const startPaneDrag = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = paneWidth
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (me) => {
      const next = Math.min(400, Math.max(160, startW + me.clientX - startX))
      setPaneWidth(next)
      localStorage.setItem(PANE_WIDTH_KEY, String(next))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [paneWidth])

  const selectedEnv = environments.find(e => e.id === selectedId)

  const addEnv = () => {
    const id = 'env-' + Date.now()
    const newEnv = { id, name: 'New Environment', vars: [] }
    const newConfig = { ...envConfig, environments: [...environments, newEnv] }
    onChange(newConfig)
    setSelectedId(id)
    setEditingId(id)
    setEditingName('New Environment')
  }

  const deleteEnv = (id) => setConfirmDelete(id)

  const confirmDeleteEnv = () => {
    const id = confirmDelete
    setConfirmDelete(null)
    const remaining = environments.filter(e => e.id !== id)
    const newActive = id === activeId ? (remaining[0]?.id || null) : activeId
    const newSelected = id === selectedId ? (remaining[0]?.id || null) : selectedId
    onChange({ activeId: newActive, environments: remaining })
    setSelectedId(newSelected)
  }

  const startRename = (env) => {
    setEditingId(env.id)
    setEditingName(env.name)
  }

  const commitRename = () => {
    if (!editingName.trim()) { setEditingId(null); return }
    onChange({
      ...envConfig,
      environments: environments.map(e => e.id === editingId ? { ...e, name: editingName.trim() } : e),
    })
    setEditingId(null)
  }

  const setActive = (id) => onChange({ ...envConfig, activeId: id })

  const updateVars = (vars) => {
    onChange({
      ...envConfig,
      environments: environments.map(e => e.id === selectedId ? { ...e, vars } : e),
    })
  }

  const updateVar = (i, field, value) =>
    updateVars(selectedEnv.vars.map((v, idx) => idx === i ? { ...v, [field]: value } : v))

  const addVar = () => updateVars([...selectedEnv.vars, { key: '', value: '', enabled: true }])
  const removeVar = (i) => updateVars(selectedEnv.vars.filter((_, idx) => idx !== i))

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${environments.find(e => e.id === confirmDelete)?.name}"? This cannot be undone.`}
          onConfirm={confirmDeleteEnv}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--vsc-editor)' }}>

        {/* Left pane */}
        <div style={{
          width: paneWidth, flexShrink: 0,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--vsc-sidebar)',
        }}>
          <div style={{
            padding: '14px 14px 10px', borderBottom: '1px solid var(--vsc-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--vsc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Environments
            </span>
            <button
              onClick={addEnv}
              title="Add environment"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vsc-text-muted)', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--vsc-text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--vsc-text-muted)'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {environments.length === 0 && (
              <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--vsc-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                No environments.<br />Click + to add one.
              </div>
            )}
            {environments.map(env => {
              const isSelected = env.id === selectedId
              const isActive = env.id === activeId
              return (
                <div
                  key={env.id}
                  onClick={() => setSelectedId(env.id)}
                  className="env-list-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px 6px 12px', cursor: 'pointer',
                    background: isSelected ? 'var(--vsc-list-active)' : 'transparent',
                    borderLeft: isSelected ? '2px solid var(--vsc-accent)' : '2px solid transparent',
                  }}
                >
                  <div
                    onClick={e => { e.stopPropagation(); setActive(isActive ? null : env.id) }}
                    title={isActive ? 'Active — click to deactivate' : 'Set as active'}
                    style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                      background: isActive ? '#4caf86' : 'transparent',
                      border: isActive ? '2px solid #4caf86' : '2px solid var(--vsc-text-muted)',
                      transition: 'all 0.15s',
                    }}
                  />

                  {editingId === env.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        flex: 1, background: 'var(--vsc-input)', border: '1px solid var(--vsc-accent)',
                        borderRadius: 3, padding: '1px 5px', fontSize: 12,
                        color: 'var(--vsc-text)', outline: 'none', minWidth: 0,
                      }}
                    />
                  ) : (
                    <span style={{
                      flex: 1, fontSize: 12, color: 'var(--vsc-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: isActive ? 600 : 400,
                    }}>
                      {env.name}
                    </span>
                  )}

                  {editingId !== env.id && (
                    <div className="env-row-actions" style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); startRename(env) }}
                        title="Rename"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vsc-text-muted)', padding: '1px 3px', borderRadius: 3, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--vsc-text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--vsc-text-muted)'}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteEnv(env.id) }}
                        title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vsc-text-muted)', padding: '1px 3px', borderRadius: 3, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f47067'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--vsc-text-muted)'}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={startPaneDrag}
          style={{
            width: 4, flexShrink: 0, cursor: 'col-resize',
            background: 'var(--vsc-border)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--vsc-accent)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--vsc-border)'}
        />

        {/* Right pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedEnv ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--vsc-text-muted)' }}>
              <div style={{ textAlign: 'center', lineHeight: 2 }}>
                <div style={{ fontSize: 13 }}>Select an environment</div>
                <div style={{ fontSize: 11 }}>or create one with +</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 28px 12px', borderBottom: '1px solid var(--vsc-border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--vsc-text)' }}>{selectedEnv.name}</span>
                  {selectedEnv.id === activeId ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#4caf86',
                      background: 'rgba(76,175,134,0.12)', padding: '2px 7px', borderRadius: 10,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>Active</span>
                  ) : (
                    <button
                      onClick={() => setActive(selectedEnv.id)}
                      style={{
                        fontSize: 11, color: 'var(--vsc-text-muted)', background: 'none',
                        border: '1px solid var(--vsc-border)', borderRadius: 10,
                        padding: '2px 9px', cursor: 'pointer',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#4caf86'; e.currentTarget.style.borderColor = '#4caf86' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--vsc-text-muted)'; e.currentTarget.style.borderColor = 'var(--vsc-border)' }}
                    >
                      Set as active
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--vsc-text-muted)', marginTop: 3 }}>
                  Use{' '}
                  <code style={{ background: '#3c3c3c', padding: '1px 6px', borderRadius: 3, fontFamily: 'Consolas,monospace', fontSize: 11, color: '#9cdcfe' }}>
                    {'{{varName}}'}
                  </code>
                  {' '}in any URL, header, body, or auth field.
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 28px' }}>
                {selectedEnv.vars.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 32px', gap: '0 8px', marginBottom: 6, padding: '0 2px' }}>
                    <div />
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--vsc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Variable</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--vsc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Value</div>
                    <div />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedEnv.vars.map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 32px', gap: '0 8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <input
                          type="checkbox"
                          className="kv-checkbox"
                          checked={row.enabled}
                          onChange={e => updateVar(i, 'enabled', e.target.checked)}
                          title={row.enabled ? 'Disable' : 'Enable'}
                        />
                      </div>
                      <input
                        className="kv-input"
                        placeholder="VARIABLE_NAME"
                        value={row.key}
                        onChange={e => updateVar(i, 'key', e.target.value)}
                        style={{ opacity: row.enabled ? 1 : 0.45 }}
                      />
                      <input
                        className="kv-input"
                        placeholder="value"
                        value={row.value}
                        onChange={e => updateVar(i, 'value', e.target.value)}
                        style={{ opacity: row.enabled ? 1 : 0.45 }}
                      />
                      <button className="kv-delete" onClick={() => removeVar(i)}>✕</button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: selectedEnv.vars.length ? 10 : 0 }}>
                  <button className="add-row-btn" onClick={addVar} style={{ width: '100%' }}>
                    + Add variable
                  </button>
                </div>

                {selectedEnv.vars.length === 0 && (
                  <div style={{ marginTop: 48, textAlign: 'center', color: 'var(--vsc-text-muted)', lineHeight: 2 }}>
                    <div style={{ fontSize: 13 }}>No variables in this environment</div>
                    <div style={{ fontSize: 11 }}>Variables captured from responses will appear here automatically.</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
