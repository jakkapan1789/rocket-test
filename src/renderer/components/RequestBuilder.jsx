import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import SimpleSelect from './SimpleSelect.jsx'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function HighlightInput({ value, onChange, className = '', placeholder, onKeyDown, style, envVars = [] }) {
  const inputRef = useRef(null)
  const backRef  = useRef(null)

  const syncScroll = () => {
    if (backRef.current && inputRef.current)
      backRef.current.scrollLeft = inputRef.current.scrollLeft
  }

  const knownKeys = useMemo(() =>
    new Set(envVars.filter(v => v.enabled !== false && v.key).map(v => v.key))
  , [envVars])

  const highlighted = useMemo(() =>
    (value || '').split(/(\{\{[^}]*\}\})/).map(part => {
      if (/^\{\{[^}]*\}\}$/.test(part)) {
        const name = part.slice(2, -2)
        const cls = knownKeys.has(name) ? 'var-hl var-hl-ok' : 'var-hl var-hl-err'
        return `<mark class="${cls}">${escapeHtml(part)}</mark>`
      }
      return escapeHtml(part)
    }).join('')
  , [value, knownKeys])

  return (
    <div className="hi-wrap">
      <div
        ref={backRef}
        className={`hi-back ${className}`}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      <input
        ref={inputRef}
        className={`hi-field ${className}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        style={style}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}

const METHOD_COLORS = {
  GET:     'var(--m-get)',
  POST:    'var(--m-post)',
  PUT:     'var(--m-put)',
  DELETE:  'var(--m-delete)',
  PATCH:   'var(--m-patch)',
  HEAD:    'var(--vsc-text-dim)',
  OPTIONS: 'var(--vsc-text-dim)',
}

function MethodSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="ms-wrap" ref={wrapRef}>
      <button
        className="ms-btn"
        style={{ color: METHOD_COLORS[value] }}
        onClick={() => setOpen(o => !o)}
      >
        <span>{value}</span>
        <svg
          className={`ms-chevron${open ? ' open' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="currentColor"
        >
          <path d="M0 0l5 6 5-6z"/>
        </svg>
      </button>

      {open && (
        <div className="ms-menu">
          {METHODS.map(m => (
            <div
              key={m}
              className={`ms-item${m === value ? ' active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(m); setOpen(false) }}
            >
              <span className="ms-item-label" style={{ color: METHOD_COLORS[m] }}>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KVEditor({ rows, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value', envVars = [] }) {
  const update = (index, field, value) => {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    onChange(next)
  }

  const addRow = () => onChange([...rows, { key: '', value: '', enabled: true }])

  const removeRow = (index) => {
    const next = rows.filter((_, i) => i !== index)
    onChange(next.length ? next : [{ key: '', value: '', enabled: true }])
  }

  return (
    <div className="kv-editor">
      {rows.map((row, i) => (
        <div key={i} className="kv-row">
          <input
            type="checkbox"
            className="kv-checkbox"
            checked={row.enabled}
            onChange={(e) => update(i, 'enabled', e.target.checked)}
          />
          <HighlightInput
            className="kv-input"
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(e) => update(i, 'key', e.target.value)}
            envVars={envVars}
          />
          <HighlightInput
            className="kv-input"
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(e) => update(i, 'value', e.target.value)}
            envVars={envVars}
          />
          <button className="kv-delete" onClick={() => removeRow(i)}>✕</button>
        </div>
      ))}
      <button className="add-row-btn" onClick={addRow}>+ Add row</button>
    </div>
  )
}

function AuthPanel({ auth, onChange, envVars = [] }) {
  const set = (field, value) => onChange({ ...auth, [field]: value })

  return (
    <div className="auth-panel">
      <div>
        <div className="auth-label" style={{ marginBottom: 6 }}>Auth Type</div>
        <SimpleSelect
          value={auth.type}
          onChange={(v) => onChange({ ...auth, type: v })}
          options={[
            { value: 'none',    label: 'No Auth' },
            { value: 'bearer',  label: 'Bearer Token' },
            { value: 'basic',   label: 'Basic Auth' },
            { value: 'apikey',  label: 'API Key' },
          ]}
        />
      </div>

      {auth.type === 'bearer' && (
        <div className="auth-field">
          <label className="auth-label">Token</label>
          <HighlightInput
            className="auth-input"
            placeholder="Enter bearer token or {{variable}}"
            value={auth.token || ''}
            onChange={(e) => set('token', e.target.value)}
            envVars={envVars}
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <>
          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input
              className="auth-input"
              placeholder="Username"
              value={auth.username || ''}
              onChange={(e) => set('username', e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={auth.password || ''}
              onChange={(e) => set('password', e.target.value)}
            />
          </div>
        </>
      )}

      {auth.type === 'apikey' && (
        <>
          <div className="auth-field">
            <label className="auth-label">Key Name</label>
            <input
              className="auth-input"
              placeholder="e.g. X-API-Key"
              value={auth.keyName || ''}
              onChange={(e) => set('keyName', e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Key Value</label>
            <HighlightInput
              className="auth-input"
              placeholder="API key value or {{variable}}"
              value={auth.keyValue || ''}
              onChange={(e) => set('keyValue', e.target.value)}
              envVars={envVars}
            />
          </div>
        </>
      )}

      {auth.type === 'none' && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
          No authentication will be sent with this request.
        </div>
      )}
    </div>
  )
}

function resolvePath(obj, path) {
  if (obj == null || !path) return undefined
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

// ── Custom variable name selector ────────────────────────────────────────────

function VarSelect({ value, onChange, options = [], placeholder }) {
  const [open, setOpen]       = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  const filtered = options.filter(o =>
    !value.trim() || o.toLowerCase().includes(value.toLowerCase())
  )

  const isExisting = options.includes(value)
  const isNew      = value.trim() && !isExisting

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = useCallback((opt) => {
    onChange(opt)
    setOpen(false)
    setActiveIdx(-1)
    inputRef.current?.blur()
  }, [onChange])

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      select(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  return (
    <div className="var-select-wrap" ref={wrapRef}>
      <div className="var-select-input-row">
        <input
          ref={inputRef}
          className={`var-select-input${options.length ? ' has-options' : ''}`}
          placeholder={options.length ? placeholder : 'Variable name (e.g. token)'}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIdx(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />

        {/* badge: existing / new */}
        {isExisting && (
          <span className="var-select-badge existing">existing</span>
        )}
        {isNew && (
          <span className="var-select-badge new-var">+ new</span>
        )}

        {/* chevron */}
        {options.length > 0 && (
          <span className={`var-select-chevron${open ? ' open' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o) }}>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
              <path d="M0 0l5 6 5-6z"/>
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown menu */}
      {open && options.length > 0 && (
        <div className="var-select-menu">
          {filtered.length === 0 ? (
            <div className="var-select-empty">No matching variables</div>
          ) : (
            filtered.map((opt, idx) => (
              <div
                key={opt}
                className={`var-select-item${activeIdx === idx ? ' active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); select(opt) }}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <span className="var-select-item-icon">{'{{}}'}</span>
                <span className="var-select-item-name">{opt}</span>
                <span className="var-select-item-hint">env var</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Extract (Capture) Editor ──────────────────────────────────────────────────

function ExtractEditor({ captures, onChange, response, envVars = [] }) {
  const update = (i, field, value) =>
    onChange(captures.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  const addRule = () => onChange([...captures, { varName: '', path: '' }])
  const removeRule = (i) => onChange(captures.filter((_, idx) => idx !== i))

  const responseData = response?.data ?? null
  const existingVarKeys = envVars.filter(v => v.key).map(v => v.key)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--vsc-text-muted)', lineHeight: 1.6 }}>
        After a response is received, extract values from the JSON body and save them as environment variables automatically.
        Use{' '}<code style={{ background: '#3c3c3c', padding: '1px 5px', borderRadius: 3, fontFamily: 'Consolas,monospace', fontSize: 10, color: '#9cdcfe' }}>access_token</code>
        {' '}or{' '}<code style={{ background: '#3c3c3c', padding: '1px 5px', borderRadius: 3, fontFamily: 'Consolas,monospace', fontSize: 10, color: '#9cdcfe' }}>data.token</code>
        {' '}as the path.
      </div>

      {existingVarKeys.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--vsc-orange)', background: 'rgba(206,145,120,0.08)', border: '1px solid rgba(206,145,120,0.2)', borderRadius: 4, padding: '6px 10px' }}>
          No environment variables yet — create some in the Env tab first, then select them here.
        </div>
      )}

      <div className="kv-editor">
        {captures.map((rule, i) => {
          const matched = rule.path?.trim() && responseData != null
            ? resolvePath(responseData, rule.path.trim())
            : undefined
          const hasResponse = responseData != null
          const pathOk = matched !== undefined && matched !== null

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="kv-row" style={{ alignItems: 'stretch' }}>
                {/* Variable name — custom dropdown */}
                <VarSelect
                  value={rule.varName}
                  onChange={(v) => update(i, 'varName', v)}
                  options={existingVarKeys}
                  placeholder="Select or type variable name"
                />

                <span style={{ fontSize: 13, color: 'var(--vsc-text-muted)', flexShrink: 0, padding: '0 4px', alignSelf: 'center' }}>←</span>

                {/* JSON path */}
                <input
                  className="kv-input"
                  placeholder="JSON path  (e.g. access_token)"
                  value={rule.path}
                  onChange={(e) => update(i, 'path', e.target.value)}
                  style={hasResponse && rule.path?.trim()
                    ? { borderColor: pathOk ? 'var(--vsc-green)' : 'var(--vsc-red)' }
                    : {}}
                />
                <button className="kv-delete" onClick={() => removeRule(i)} style={{ alignSelf: 'center' }}>✕</button>
              </div>

              {hasResponse && rule.path?.trim() && (
                <div style={{ paddingLeft: 2, fontSize: 11, fontFamily: 'Consolas,monospace' }}>
                  {pathOk
                    ? <span style={{ color: 'var(--vsc-green)' }}>✓ &quot;{String(matched).slice(0, 60)}{String(matched).length > 60 ? '…' : ''}&quot; → <span style={{ color: '#9cdcfe' }}>{'{{'}{rule.varName || '?'}{'}}' }</span></span>
                    : <span style={{ color: 'var(--vsc-red)' }}>✗ path not found in last response</span>
                  }
                </div>
              )}
            </div>
          )
        })}
        <button className="add-row-btn" onClick={addRule}>+ Add extract rule</button>
      </div>

      {/* Response tree browser */}
      {responseData != null && typeof responseData === 'object' && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--vsc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Last response — click a key to use as path
          </div>
          <div style={{ background: '#2a2a2a', border: '1px solid var(--vsc-border)', borderRadius: 4, padding: '8px 10px', maxHeight: 180, overflowY: 'auto' }}>
            <ResponseTree data={responseData} onSelect={(path) => {
              const empty = captures.findIndex(c => !c.path)
              if (empty >= 0) update(empty, 'path', path)
              else onChange([...captures, { varName: '', path }])
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

function ResponseTree({ data, path = '', onSelect, depth = 0 }) {
  if (data === null || data === undefined) return null

  if (typeof data !== 'object' || depth > 3) {
    const display = String(data)
    const short = display.length > 40 ? display.slice(0, 40) + '…' : display
    return (
      <span
        title={path ? `Click to use: ${path}` : ''}
        style={{ color: 'var(--vsc-string)', cursor: path ? 'pointer' : 'default', fontSize: 12, fontFamily: 'Consolas,monospace' }}
        onClick={() => path && onSelect(path)}
      >
        &quot;{short}&quot;
      </span>
    )
  }

  if (Array.isArray(data)) {
    return (
      <span style={{ color: 'var(--vsc-text-muted)', fontSize: 12, fontFamily: 'Consolas,monospace' }}>
        [{data.length} items]
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Object.entries(data).map(([key, val]) => {
        const fullPath = path ? `${path}.${key}` : key
        const isLeaf = typeof val !== 'object' || val === null
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: depth * 12 }}>
            <span
              style={{ color: '#9cdcfe', fontSize: 12, fontFamily: 'Consolas,monospace', flexShrink: 0, cursor: 'pointer' }}
              title={`Click to use: ${fullPath}`}
              onClick={() => onSelect(fullPath)}
            >
              {key}:
            </span>
            <ResponseTree data={val} path={fullPath} onSelect={onSelect} depth={depth + 1} />
          </div>
        )
      })}
    </div>
  )
}

function SaveModal({ onSave, onClose, collections }) {
  const [name, setName] = useState('')
  const [colId, setColId] = useState(collections[0]?.id || '')

  const handleSave = () => {
    if (!name.trim() || !colId) return
    onSave(name.trim(), colId)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Save Request</div>
        <input
          className="modal-input"
          placeholder="Request name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <select
          className="modal-select"
          value={colId}
          onChange={(e) => setColId(e.target.value)}
        >
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim() || !colId}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

const TAB_LABELS = {
  params:  'Params',
  headers: 'Headers',
  body:    'Body',
  auth:    'Auth',
  extract: 'Scripts',
}

export default function RequestBuilder({ request, onChange, onSend, onSave, onUpdate, onClose, loading, collections, activeReq, response, envVars = [] }) {
  const [tab, setTab] = useState('params')
  const [showSave, setShowSave] = useState(false)

  const set = (field, value) => onChange({ ...request, [field]: value })

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend()
  }

  const extractCount = (request.captures || []).filter(c => c.varName && c.path).length

  return (
    <div className="request-builder" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="url-bar">
        <MethodSelect
          value={request.method}
          onChange={(m) => set('method', m)}
        />

        <HighlightInput
          className="url-input"
          placeholder="https://api.example.com/endpoint  or {{baseUrl}}/path"
          value={request.url}
          onChange={(e) => set('url', e.target.value)}
          onKeyDown={handleKeyDown}
          envVars={envVars}
        />

        {activeReq ? (
          <button
            className="save-btn save-btn-update"
            onClick={onUpdate}
            disabled={!request.url.trim()}
            title={`Update "${activeReq.name}"`}
          >
            Update
          </button>
        ) : (
          <button
            className="save-btn"
            onClick={() => setShowSave(true)}
            disabled={!request.url.trim() || collections.length === 0}
            title={collections.length === 0 ? 'Create a collection first' : 'Save request'}
          >
            Save
          </button>
        )}

        <button
          className={`send-btn ${loading ? 'loading' : ''}`}
          onClick={onSend}
          disabled={loading || !request.url.trim()}
        >
          {loading ? <span className="spinner" /> : 'Send'}
        </button>

        <button className="close-builder-btn" onClick={onClose} title="Close">
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
        </button>
      </div>

      <div className="tabs">
        {['params', 'headers', 'body', 'auth', 'extract'].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            {t === 'headers' && request.headers.filter((h) => h.key && h.enabled).length > 0 && (
              <span style={{ marginLeft: 4, color: 'var(--vsc-accent)', fontSize: 10 }}>
                {request.headers.filter((h) => h.key && h.enabled).length}
              </span>
            )}
            {t === 'params' && request.params.filter((p) => p.key && p.enabled).length > 0 && (
              <span style={{ marginLeft: 4, color: 'var(--vsc-accent)', fontSize: 10 }}>
                {request.params.filter((p) => p.key && p.enabled).length}
              </span>
            )}
            {t === 'extract' && extractCount > 0 && (
              <span style={{ marginLeft: 4, color: 'var(--vsc-green)', fontSize: 10 }}>
                {extractCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'params' && (
          <KVEditor
            rows={request.params}
            onChange={(v) => set('params', v)}
            keyPlaceholder="Parameter"
            valuePlaceholder="Value"
            envVars={envVars}
          />
        )}

        {tab === 'headers' && (
          <KVEditor
            rows={request.headers}
            onChange={(v) => set('headers', v)}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            envVars={envVars}
          />
        )}

        {tab === 'body' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['GET', 'HEAD', 'OPTIONS'].includes(request.method) && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>
                {request.method} requests typically don't include a body.
              </div>
            )}
            <div style={{ flex: 1, minHeight: 200, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <Editor
                height="300px"
                language="json"
                theme="vs-dark"
                value={request.body}
                onChange={(v) => set('body', v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  formatOnPaste: true,
                  automaticLayout: true,
                  padding: { top: 8, bottom: 8 },
                }}
              />
            </div>
          </div>
        )}

        {tab === 'auth' && (
          <AuthPanel auth={request.auth} onChange={(v) => set('auth', v)} envVars={envVars} />
        )}

        {tab === 'extract' && (
          <ExtractEditor
            captures={request.captures || []}
            onChange={(v) => set('captures', v)}
            response={response}
            envVars={envVars}
          />
        )}
      </div>

      {showSave && (
        <SaveModal
          collections={collections}
          onSave={onSave}
          onClose={() => setShowSave(false)}
        />
      )}
    </div>
  )
}
