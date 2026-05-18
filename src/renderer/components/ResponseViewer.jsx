import { useState } from 'react'

function fmtBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function statusCls(s) {
  if (!s) return 'status-0xx'
  if (s < 300) return 'status-2xx'
  if (s < 400) return 'status-3xx'
  if (s < 500) return 'status-4xx'
  return 'status-5xx'
}

function syntaxHighlight(json) {
  if (typeof json !== 'string') json = JSON.stringify(json, null, 2)
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match))       cls = /:$/.test(match) ? 'json-key' : 'json-string'
      else if (/true|false/.test(match)) cls = 'json-bool'
      else if (/null/.test(match)) cls = 'json-null'
      return `<span class="${cls}">${match}</span>`
    }
  )
}

function SecurityPanel({ results }) {
  if (!results) return null
  const order = { high: 0, medium: 1, low: 2 }
  const sorted = [...results].sort((a, b) => {
    if (!a.present && b.present) return -1
    if (a.present && !b.present) return 1
    return (order[a.severity] || 3) - (order[b.severity] || 3)
  })

  return (
    <div className="security-panel">
      {sorted.map((item) => {
        const cls = item.present ? 'pass' : item.severity === 'high' ? 'warn' : 'warn-medium'
        const icon = item.present ? '✓' : item.severity === 'high' ? '✗' : '⚠'
        return (
          <div key={item.header} className={`security-item ${cls}`}>
            <div className="security-icon">{icon}</div>
            <div style={{ flex: 1 }}>
              <div className="security-header-name">{item.header}</div>
              <div className="security-desc">{item.description}</div>
              {item.value && <div className="security-value">{item.value}</div>}
            </div>
            <div style={{ fontSize: 9, color: 'var(--vsc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
              {item.severity}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ResponseViewer({ response, loading, securityResults }) {
  const [tab, setTab] = useState('body')

  if (loading) {
    return (
      <div className="response-viewer">
        <div className="response-placeholder" style={{ flex: 1 }}>
          <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--vsc-text-muted)', marginTop: 8 }}>Sending request…</span>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="response-viewer">
        <div className="response-placeholder" style={{ flex: 1 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--vsc-text-muted)', opacity: 0.4 }}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="8 12 12 16 16 12"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
          </svg>
          <div style={{ fontSize: 12, color: 'var(--vsc-text-dim)' }}>Send a request to see response</div>
          <div style={{ fontSize: 11, color: 'var(--vsc-text-muted)' }}>Ctrl+Enter / Cmd+Enter</div>
        </div>
      </div>
    )
  }

  const warnings = securityResults?.filter((r) => !r.present).length || 0
  const sc = statusCls(response.status)

  let prettyJson = response.responseText
  try {
    if (response.data && typeof response.data === 'object') {
      prettyJson = JSON.stringify(response.data, null, 2)
    }
  } catch { /* raw */ }

  const highlighted = (() => {
    try { JSON.parse(prettyJson); return syntaxHighlight(prettyJson) }
    catch { return null }
  })()

  const respHeaders = response.headers ? Object.entries(response.headers) : []

  return (
    <div className="response-viewer">
      {/* Status bar */}
      <div className="response-meta-bar">
        <div className="resp-stat">
          <span className="resp-stat-label">Status</span>
          <span className={`resp-stat-value status-badge ${sc}`} style={{ fontSize: 12 }}>
            {response.status || 'ERR'}&nbsp;{response.statusText}
          </span>
        </div>
        <div className="resp-stat">
          <span className="resp-stat-label">Time</span>
          <span className="resp-stat-value" style={{ color: response.time > 1000 ? 'var(--vsc-orange)' : 'var(--vsc-green)' }}>
            {response.time}ms
          </span>
        </div>
        <div className="resp-stat">
          <span className="resp-stat-label">Size</span>
          <span className="resp-stat-value" style={{ color: 'var(--vsc-text-dim)' }}>{fmtBytes(response.size)}</span>
        </div>
        {warnings > 0 && (
          <div
            className="resp-stat"
            style={{ marginLeft: 'auto', cursor: 'pointer', borderLeft: '1px solid var(--vsc-border)' }}
            onClick={() => setTab('security')}
          >
            <span style={{ fontSize: 11, color: '#e2b714', fontWeight: 600 }}>⚠ {warnings} warning{warnings > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="response-body">
        <div className="tabs">
          {['body', 'headers', 'security'].map((t) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'security' && warnings > 0 && (
                <span style={{ marginLeft: 4, color: '#e2b714', fontSize: 10, fontWeight: 700 }}>
                  {warnings}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="response-content">
          {tab === 'body' && (
            response.error && !response.data
              ? <div style={{ color: 'var(--vsc-red)', fontSize: 12, fontFamily: 'Consolas,monospace' }}>Error: {response.error}</div>
              : highlighted
                ? <pre className="response-json" dangerouslySetInnerHTML={{ __html: highlighted }} />
                : <pre className="response-json">{prettyJson}</pre>
          )}

          {tab === 'headers' && (
            <table className="headers-table">
              <thead><tr><th>Header</th><th>Value</th></tr></thead>
              <tbody>
                {respHeaders.map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{String(v)}</td></tr>
                ))}
                {!respHeaders.length && (
                  <tr><td colSpan={2} style={{ color: 'var(--vsc-text-muted)' }}>No headers</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'security' && <SecurityPanel results={securityResults} />}
        </div>
      </div>
    </div>
  )
}
