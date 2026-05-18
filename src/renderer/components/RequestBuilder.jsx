import { useState } from 'react'
import Editor from '@monaco-editor/react'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

function KVEditor({ rows, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }) {
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
          <input
            className="kv-input"
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(e) => update(i, 'key', e.target.value)}
          />
          <input
            className="kv-input"
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button className="kv-delete" onClick={() => removeRow(i)}>✕</button>
        </div>
      ))}
      <button className="add-row-btn" onClick={addRow}>+ Add row</button>
    </div>
  )
}

function AuthPanel({ auth, onChange }) {
  const set = (field, value) => onChange({ ...auth, [field]: value })

  return (
    <div className="auth-panel">
      <div>
        <div className="auth-label" style={{ marginBottom: 6 }}>Auth Type</div>
        <select
          className="auth-type-select"
          value={auth.type}
          onChange={(e) => onChange({ ...auth, type: e.target.value })}
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
        </select>
      </div>

      {auth.type === 'bearer' && (
        <div className="auth-field">
          <label className="auth-label">Token</label>
          <input
            className="auth-input"
            placeholder="Enter bearer token or {{variable}}"
            value={auth.token || ''}
            onChange={(e) => set('token', e.target.value)}
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
            <input
              className="auth-input"
              placeholder="API key value or {{variable}}"
              value={auth.keyValue || ''}
              onChange={(e) => set('keyValue', e.target.value)}
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

      {/* datalist for existing var names */}
      <datalist id="extract-varnames">
        {existingVarKeys.map(k => <option key={k} value={k} />)}
      </datalist>

      <div className="kv-editor">
        {captures.map((rule, i) => {
          const matched = rule.path?.trim() && responseData != null
            ? resolvePath(responseData, rule.path.trim())
            : undefined
          const hasResponse = responseData != null
          const pathOk = matched !== undefined && matched !== null

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="kv-row">
                {/* Variable name — dropdown from env + free type */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    className="kv-input extract-var-input"
                    list="extract-varnames"
                    placeholder={existingVarKeys.length ? 'Select or type variable name' : 'Variable name (e.g. token)'}
                    value={rule.varName}
                    onChange={(e) => update(i, 'varName', e.target.value)}
                    style={{ width: '100%' }}
                  />
                  {rule.varName && existingVarKeys.includes(rule.varName) && (
                    <span style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 9, color: 'var(--vsc-green)', pointerEvents: 'none',
                    }}>✓ existing</span>
                  )}
                  {rule.varName && !existingVarKeys.includes(rule.varName) && rule.varName.trim() && (
                    <span style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 9, color: 'var(--vsc-accent)', pointerEvents: 'none',
                    }}>+ new</span>
                  )}
                </div>

                <span style={{ fontSize: 11, color: 'var(--vsc-text-muted)', flexShrink: 0, padding: '0 2px' }}>←</span>

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
                <button className="kv-delete" onClick={() => removeRule(i)}>✕</button>
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
  extract: 'Extract',
}

export default function RequestBuilder({ request, onChange, onSend, onSave, onUpdate, onClose, loading, collections, activeReq, response, envVars = [] }) {
  const [tab, setTab] = useState('params')
  const [showSave, setShowSave] = useState(false)

  const set = (field, value) => onChange({ ...request, [field]: value })

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend()
  }

  const methodColor = {
    GET: 'var(--green)', POST: 'var(--accent)', PUT: 'var(--orange)',
    DELETE: 'var(--red)', PATCH: 'var(--purple)', HEAD: 'var(--text-secondary)',
    OPTIONS: 'var(--text-secondary)',
  }

  const extractCount = (request.captures || []).filter(c => c.varName && c.path).length

  return (
    <div className="request-builder" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="url-bar">
        <select
          className="method-select"
          value={request.method}
          onChange={(e) => set('method', e.target.value)}
          style={{ color: methodColor[request.method] || 'var(--text-primary)' }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m} style={{ color: methodColor[m] }}>{m}</option>
          ))}
        </select>

        <input
          className="url-input"
          placeholder="https://api.example.com/endpoint  or {{baseUrl}}/path"
          value={request.url}
          onChange={(e) => set('url', e.target.value)}
          onKeyDown={handleKeyDown}
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
          />
        )}

        {tab === 'headers' && (
          <KVEditor
            rows={request.headers}
            onChange={(v) => set('headers', v)}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
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
          <AuthPanel auth={request.auth} onChange={(v) => set('auth', v)} />
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
