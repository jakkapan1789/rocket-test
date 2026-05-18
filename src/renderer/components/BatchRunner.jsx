import { useState, useRef, useCallback } from 'react'
import { sendRequest } from '../../services/apiClient.js'
import SimpleSelect from './SimpleSelect.jsx'

function resolvePath(obj, path) {
  if (obj == null || !path) return undefined
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function applyCaptures(vars, captures, responseData) {
  if (!captures?.length || responseData == null) return vars
  let next = [...vars]
  captures.forEach(({ varName, path }) => {
    if (!varName?.trim() || !path?.trim()) return
    const value = resolvePath(responseData, path.trim())
    if (value == null) return
    const str = String(value)
    const idx = next.findIndex(v => v.key === varName.trim())
    if (idx >= 0) next = next.map((v, i) => i === idx ? { ...v, value: str } : v)
    else next = [...next, { key: varName.trim(), value: str, enabled: true }]
  })
  return next
}

function getStatusClass(status) {
  if (!status || status === 0) return 'status-0xx'
  if (status < 300) return 'status-2xx'
  if (status < 400) return 'status-3xx'
  if (status < 500) return 'status-4xx'
  return 'status-5xx'
}

function FlowNode({ node, index, total, onRemove, onDragStart, onDragOver, onDrop, draggingOver }) {
  const hasExtracts = (node.captures || []).filter(c => c.varName && c.path).length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        className={`flow-node ${draggingOver === index ? 'flow-node-over' : ''}`}
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(index) }}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
        onDrop={(e) => { e.preventDefault(); onDrop(index) }}
      >
        <div className="flow-node-header">
          <div className="flow-node-step">Step {index + 1}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {hasExtracts > 0 && (
              <span title={`${hasExtracts} variable extract rule(s)`}
                style={{ fontSize: 9, color: 'var(--vsc-green)', background: 'rgba(78,201,176,0.12)', borderRadius: 3, padding: '1px 4px' }}>
                extract {hasExtracts}
              </span>
            )}
            <span className="flow-drag-handle" title="Drag to reorder">⠿</span>
            <button className="flow-node-remove" onClick={() => onRemove(node.nodeId)} title="Remove">✕</button>
          </div>
        </div>
        <div className="flow-node-body">
          <span className={`method-badge m-${node.method}`}>{node.method}</span>
          <span className="flow-node-name">{node.name}</span>
        </div>
        <div className="flow-node-url">{node.url || 'No URL set'}</div>
      </div>
      {index < total - 1 && (
        <div className="flow-arrow">
          <svg width="12" height="36" viewBox="0 0 12 36" fill="none">
            <line x1="6" y1="0" x2="6" y2="26" stroke="var(--vsc-accent)" strokeWidth="1.5" strokeDasharray="4 3"/>
            <polygon points="6,36 1,24 11,24" fill="var(--vsc-accent)"/>
          </svg>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ results, status }) {
  const total = results.length
  const passed = results.filter((r) => r.status >= 200 && r.status < 300).length
  const failed = total - passed
  const times = results.map((r) => r.time).filter(Boolean)
  const avg = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : 0
  const max = times.length ? Math.max(...times) : 0

  return (
    <div className="batch-summary-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="batch-summary-title">Run Summary</div>
        {status === 'cancelled' && (
          <span style={{ fontSize: 10, color: 'var(--vsc-orange)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cancelled
          </span>
        )}
      </div>
      <div className="batch-summary-stats">
        {[
          { label: 'Total', value: total, color: 'var(--vsc-accent)' },
          { label: 'Passed', value: passed, color: 'var(--vsc-green)' },
          { label: 'Failed', value: failed, color: failed > 0 ? 'var(--vsc-red)' : 'var(--vsc-text-dim)' },
          { label: 'Avg', value: `${avg}ms`, color: avg > 1000 ? 'var(--vsc-orange)' : 'var(--vsc-text)' },
          { label: 'Max', value: `${max}ms`, color: max > 2000 ? 'var(--vsc-red)' : 'var(--vsc-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="batch-summary-stat">
            <div className="batch-summary-stat-value" style={{ color }}>{value}</div>
            <div className="batch-summary-stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultCard({ result, index }) {
  const passed = result.status >= 200 && result.status < 300
  return (
    <div className={`batch-result-card ${passed ? 'batch-result-pass' : 'batch-result-fail'}`}>
      <div className="batch-result-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="batch-result-index">#{index + 1}</span>
          <span className={`method-badge m-${result.method}`}>{result.method}</span>
          <span className="batch-result-name">{result.name}</span>
          {result.iteration > 1 && (
            <span style={{ fontSize: 10, color: 'var(--vsc-text-muted)' }}>iter {result.iteration}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`status-badge ${getStatusClass(result.status)}`}>
            {result.status || 'ERR'}
          </span>
          <span className="batch-result-time" style={{ color: result.time > 1000 ? 'var(--vsc-orange)' : 'var(--vsc-green)' }}>
            {result.time}ms
          </span>
        </div>
      </div>
      <div className="batch-result-url">{result.resolvedUrl || result.url}</div>
      {result.error && <div className="batch-result-error">{result.error}</div>}
      {result.captured?.length > 0 && (
        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {result.captured.map((c, i) => (
            <span key={i} style={{
              fontSize: 10, background: 'rgba(78,201,176,0.12)', color: 'var(--vsc-green)',
              border: '1px solid rgba(78,201,176,0.25)', borderRadius: 3, padding: '1px 6px',
              fontFamily: 'Consolas,monospace',
            }}>
              ✓ {c.key} = &quot;{c.value.length > 30 ? c.value.slice(0, 30) + '…' : c.value}&quot;
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function useResize(initial, min, max) {
  const [width, setWidth] = useState(initial)
  const [dragging, setDragging] = useState(false)

  const startResize = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    setDragging(true)
    const onMove = (me) => setWidth(Math.min(max, Math.max(min, startW + me.clientX - startX)))
    const onUp = () => {
      setDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, min, max])

  return [width, dragging, startResize]
}

export default function BatchRunner({ collections, envConfig, activeEnvVars = [] }) {
  const [selectedColId, setSelectedColId] = useState(collections[0]?.id || '')
  const [flowNodes, setFlowNodes]         = useState([])
  const [iterations, setIterations]       = useState(1)
  const [concurrency, setConcurrency]     = useState(1)
  const [delay, setDelay]                 = useState(0)
  const [status, setStatus]               = useState('idle')
  const [progress, setProgress]           = useState(0)
  const [total, setTotal]                 = useState(0)
  const [results, setResults]             = useState([])
  const [draggingOver, setDraggingOver]   = useState(null)

  const [leftWidth,    leftDragging,   startLeftResize]   = useResize(240, 180, 420)
  const [centerWidth, centerDragging, startCenterResize]  = useResize(300, 220, 500)

  const runIdRef     = useRef(0)
  const dragIndexRef = useRef(null)

  const activeEnvName = envConfig?.environments?.find(e => e.id === envConfig.activeId)?.name

  const selectedCol = collections.find((c) => c.id === selectedColId)
  const colRequests = selectedCol?.requests || []

  const addToFlow    = (req) => setFlowNodes(prev => [...prev, { ...req, nodeId: `${req.id}-${Date.now()}` }])
  const removeFromFlow = (nodeId) => setFlowNodes(prev => prev.filter(n => n.nodeId !== nodeId))
  const handleDragStart = (index) => { dragIndexRef.current = index }
  const handleDragOver  = (index) => {
    if (dragIndexRef.current === null || dragIndexRef.current === index) return
    setDraggingOver(index)
    const next = [...flowNodes]
    const [moved] = next.splice(dragIndexRef.current, 1)
    next.splice(index, 0, moved)
    dragIndexRef.current = index
    setFlowNodes(next)
  }
  const handleDrop = () => { dragIndexRef.current = null; setDraggingOver(null) }
  const cancel     = () => { runIdRef.current++; setStatus('cancelled') }

  // ── Run batch ──────────────────────────────────────────────────────────────
  // Each iteration runs its steps SEQUENTIALLY so captures thread through.
  // `concurrency` iterations run at the same time.
  const runBatch = useCallback(async () => {
    if (!flowNodes.length) return
    const myRunId = ++runIdRef.current
    const totalJobs = flowNodes.length * iterations

    setStatus('running')
    setProgress(0)
    setTotal(totalJobs)
    setResults([])

    const runIteration = async (iterNum) => {
      // Each iteration gets its own working copy of env vars starting from the active env
      let vars = [...activeEnvVars]

      for (const node of flowNodes) {
        if (runIdRef.current !== myRunId) return

        const t0 = performance.now()
        const res = await sendRequest(node, vars)
        const elapsed = Math.round(performance.now() - t0)

        if (runIdRef.current !== myRunId) return

        // Apply captures to vars so the NEXT step can use them
        const capturedList = []
        if (node.captures?.length && res.data != null) {
          node.captures.forEach(({ varName, path }) => {
            if (!varName?.trim() || !path?.trim()) return
            const value = resolvePath(res.data, path.trim())
            if (value == null) return
            const str = String(value)
            capturedList.push({ key: varName.trim(), value: str })
          })
          vars = applyCaptures(vars, node.captures, res.data)
        }

        setProgress(p => p + 1)
        setResults(prev => [...prev, {
          id:          `${node.nodeId}-${iterNum}-${Date.now()}`,
          name:        node.name,
          method:      node.method,
          url:         node.url,
          resolvedUrl: res.resolvedUrl ?? node.url,
          iteration:   iterNum,
          status:      res.status,
          time:        res.time ?? elapsed,
          error:       res.error || null,
          captured:    capturedList,
        }])
      }
    }

    // Run iterations in batches of `concurrency`
    let started = 0
    while (started < iterations) {
      if (runIdRef.current !== myRunId) break
      const batch = []
      for (let c = 0; c < concurrency && started < iterations; c++, started++) {
        batch.push(runIteration(started + 1))
      }
      await Promise.all(batch)

      if (started < iterations && delay > 0 && runIdRef.current === myRunId) {
        await new Promise(r => setTimeout(r, delay))
      }
    }

    if (runIdRef.current === myRunId) setStatus('done')
  }, [flowNodes, iterations, concurrency, delay, activeEnvVars])

  const progressPct  = total > 0 ? Math.round((progress / total) * 100) : 0
  const isRunning    = status === 'running'
  const showProgress = status !== 'idle'

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>

      {/* ── LEFT: Explorer ────────────────────────────────────── */}
      <div className="batch-left-panel" style={{ width: leftWidth, minWidth: leftWidth, maxWidth: leftWidth }}>
        <div className="sidebar-title"><span>Explorer</span></div>

        {/* Env badge */}
        <div style={{ padding: '4px 10px 0', flexShrink: 0 }}>
          {activeEnvName ? (
            <div style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--vsc-green)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--vsc-green)', display: 'inline-block' }}/>
              Env: <strong>{activeEnvName}</strong>
              <span style={{ color: 'var(--vsc-text-muted)' }}>({activeEnvVars.filter(v=>v.enabled&&v.key).length} vars)</span>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--vsc-orange)' }}>
              ⚠ No active environment — {'{{...}}'} variables will not be substituted
            </div>
          )}
        </div>

        {/* Collection picker */}
        <div style={{ padding: '6px 10px 8px', borderBottom: '1px solid var(--vsc-border)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--vsc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Collection</div>
          <SimpleSelect
            value={selectedColId}
            onChange={(v) => { setSelectedColId(v); setFlowNodes([]) }}
            disabled={isRunning || collections.length === 0}
            placeholder="No collections"
            options={collections.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        {/* Request list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {collections.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: 11, color: 'var(--vsc-text-muted)' }}>Create a collection first</div>
          )}
          {collections.length > 0 && colRequests.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--vsc-text-muted)' }}>No requests in this collection</div>
          )}
          {colRequests.map((req) => (
            <div
              key={req.id}
              className={`tree-row batch-tree-req ${isRunning ? 'batch-tree-req-disabled' : ''}`}
              style={{ paddingLeft: 12, gap: 8 }}
              onClick={() => !isRunning && addToFlow(req)}
              title="Click to add to flow"
            >
              <span className={`method-badge m-${req.method}`}>{req.method}</span>
              <span className="tree-label">{req.name}</span>
              {(req.captures || []).filter(c=>c.varName&&c.path).length > 0 && (
                <span style={{ fontSize: 9, color: 'var(--vsc-green)', marginLeft: 'auto' }}>
                  extract {(req.captures).filter(c=>c.varName&&c.path).length}
                </span>
              )}
              <span className="batch-tree-plus">+</span>
            </div>
          ))}
        </div>

        {/* Run config */}
        <div style={{ borderTop: '1px solid var(--vsc-border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--vsc-text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Run Config</div>
          <label className="batch-config-label">
            <span className="auth-label">Iterations</span>
            <input type="number" className="auth-input" min={1} max={1000} value={iterations}
              onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))} disabled={isRunning} />
          </label>
          <label className="batch-config-label">
            <span className="auth-label">Concurrency</span>
            <input type="number" className="auth-input" min={1} max={20} value={concurrency}
              onChange={(e) => setConcurrency(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} disabled={isRunning} />
          </label>
          <label className="batch-config-label">
            <span className="auth-label">Delay (ms)</span>
            <input type="number" className="auth-input" min={0} max={60000} value={delay}
              onChange={(e) => setDelay(Math.max(0, parseInt(e.target.value) || 0))} disabled={isRunning} />
          </label>

          {concurrency > 1 && (
            <div style={{ fontSize: 10, color: 'var(--vsc-text-muted)', lineHeight: 1.4 }}>
              ⚠ Concurrency {'>'} 1: multiple iterations run in parallel — captured values are not shared across iterations
            </div>
          )}

          {!isRunning ? (
            <button className="batch-run-btn" onClick={runBatch} disabled={!flowNodes.length}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>
              Run
            </button>
          ) : (
            <button className="batch-cancel-btn" onClick={cancel}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className={`sidebar-resize-handle ${leftDragging ? 'dragging' : ''}`} onMouseDown={startLeftResize} />

      {/* ── CENTER: Flow diagram ──────────────────────────────── */}
      <div className="batch-flow-panel" style={{ width: centerWidth, minWidth: centerWidth, maxWidth: centerWidth }}>
        <div className="batch-flow-header">
          <span className="batch-section-title" style={{ padding: 0 }}>Execution Flow</span>
          {flowNodes.length > 0 && !isRunning && (
            <button className="batch-flow-clear" onClick={() => setFlowNodes([])}>Clear all</button>
          )}
        </div>

        <div className="batch-flow-canvas" onDragEnd={() => { dragIndexRef.current = null; setDraggingOver(null) }}>
          {flowNodes.length === 0 ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>←</div>
              <div style={{ fontSize: 12, color: 'var(--vsc-text-dim)' }}>No steps yet</div>
              <div style={{ fontSize: 11, color: 'var(--vsc-text-muted)', textAlign: 'center', marginTop: 4 }}>
                Click a request on the left<br/>to add it to the flow
              </div>
            </div>
          ) : (
            flowNodes.map((node, index) => (
              <FlowNode
                key={node.nodeId}
                node={node}
                index={index}
                total={flowNodes.length}
                onRemove={removeFromFlow}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                draggingOver={draggingOver}
              />
            ))
          )}
        </div>
      </div>

      <div className={`sidebar-resize-handle ${centerDragging ? 'dragging' : ''}`} onMouseDown={startCenterResize} />

      {/* ── RIGHT: Results ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {showProgress && (
          <div className="batch-progress-bar-wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: 'var(--vsc-text-dim)' }}>
                {isRunning
                  ? progress < total ? 'Running…' : 'Waiting for responses…'
                  : status === 'cancelled' ? 'Cancelled'
                  : 'Completed'}
                {' '}— {progress} / {total}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: status === 'cancelled' ? 'var(--vsc-orange)' : isRunning ? 'var(--vsc-accent)' : 'var(--vsc-green)',
              }}>
                {progressPct}%
              </span>
            </div>
            <div className="batch-progress-track">
              <div className="batch-progress-fill" style={{
                width: `${progressPct}%`,
                background: status === 'cancelled' ? 'var(--vsc-orange)' : isRunning ? 'var(--vsc-accent)' : 'var(--vsc-green)',
              }} />
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {status === 'idle' && (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-state-icon">🚀</div>
              <div style={{ fontSize: 13, color: 'var(--vsc-text-dim)' }}>Results</div>
              <div className="empty-state-text">Build your flow and hit Run</div>
            </div>
          )}

          {(status === 'done' || status === 'cancelled') && results.length > 0 && (
            <SummaryCard results={results} status={status} />
          )}

          {results.map((result, i) => (
            <ResultCard key={result.id} result={result} index={i} />
          ))}

          {status === 'running' && results.length === 0 && (
            <div className="empty-state" style={{ height: '100%' }}>
              <div style={{ fontSize: 13, color: 'var(--vsc-text-dim)' }}>Firing requests…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
