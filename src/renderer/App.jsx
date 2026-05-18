import { useState, useEffect, useCallback, useRef, memo } from 'react'
import Sidebar from './components/Sidebar.jsx'
import RequestBuilder from './components/RequestBuilder.jsx'
import ResponseViewer from './components/ResponseViewer.jsx'
import BatchRunner from './components/BatchRunner.jsx'
import EnvPanel from './components/EnvPanel.jsx'
import Toaster from './components/Toaster.jsx'
import { sendRequest } from '../services/apiClient.js'
import { storage } from '../services/storage.js'
import { scanResponseHeaders } from '../services/securityScanner.js'

// ── Activity bar icons ────────────────────────────────────────────────────────
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }

const ActIcons = {
  collections: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M3 7.5C3 6.1 4.1 5 5.5 5H9l2 2h7.5C19.9 7 21 8.1 21 9.5v9c0 1.4-1.1 2.5-2.5 2.5h-13C4.1 21 3 19.9 3 18.5V7.5z"/>
      <line x1="8" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  batch: (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="9.5"/>
      <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="currentColor" stroke="none"/>
    </svg>
  ),
  env: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M8 3H7c-1.1 0-2 .9-2 2v5c0 1.1-.9 2-2 2 1.1 0 2 .9 2 2v5c0 1.1.9 2 2 2h1"/>
      <path d="M16 21h1c1.1 0 2-.9 2-2v-5c0-1.1.9-2 2-2-1.1 0-2-.9-2-2V5c0-1.1-.9-2-2-2h-1"/>
    </svg>
  ),
}

const SIDEBAR_MODES = ['collections']

function resolvePath(obj, path) {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

const DEFAULT_REQUEST = {
  method: 'GET',
  url: '',
  headers: [{ key: '', value: '', enabled: true }],
  params:  [{ key: '', value: '', enabled: true }],
  body: '',
  auth: { type: 'none', token: '', username: '', password: '' },
  captures: [],
}

function RocketLogo({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path d="M16 2C13 5 10 9.5 10 16v1l6 5 6-5v-1C22 9.5 19 5 16 2z" fill="#0078d4"/>
      <path d="M16 2C13 5 10 9 10 12h12C22 9 19 5 16 2z" fill="#005ba1"/>
      <circle cx="16" cy="15" r="3.2" fill="#1a9fff" opacity="0.25"/>
      <circle cx="16" cy="15" r="2.2" fill="white" opacity="0.9"/>
      <circle cx="15" cy="14" r="0.7" fill="white"/>
      <path d="M10 17L5.5 24 10 22z" fill="#005ba1"/>
      <path d="M22 17L26.5 24 22 22z" fill="#005ba1"/>
      <rect x="13" y="21" width="6" height="2" rx="0.5" fill="#003f75"/>
      <path d="M13 23 C12.5 26 13.5 30 16 30 C18.5 30 19.5 26 19 23z" fill="#ff8c00"/>
      <path d="M14 23 C13.7 25.5 14.5 28.5 16 28.5 C17.5 28.5 18.3 25.5 18 23z" fill="#ffbc00"/>
      <path d="M15 23 C14.8 25 15.4 27 16 27 C16.6 27 17.2 25 17 23z" fill="#fff5c0"/>
    </svg>
  )
}

function VerticalSplit({ top, bottom }) {
  const containerRef = useRef(null)
  const [topPct, setTopPct] = useState(52)

  const startDrag = useCallback((e) => {
    e.preventDefault()
    const startY = e.clientY
    const startPct = topPct
    const containerH = containerRef.current?.getBoundingClientRect().height || 1

    const onMove = (me) => {
      const delta = ((me.clientY - startY) / containerH) * 100
      setTopPct(Math.min(80, Math.max(20, startPct + delta)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [topPct])

  return (
    <div ref={containerRef} className="vsplit-container">
      <div className="vsplit-top" style={{ height: `${topPct}%` }}>
        {top}
      </div>
      <div className="vsplit-handle" onMouseDown={startDrag}>
        <div className="vsplit-handle-grip" />
      </div>
      <div className="vsplit-bottom">
        {bottom}
      </div>
    </div>
  )
}

function SplashScreen({ hiding }) {
  return (
    <div className={`splash${hiding ? ' hiding' : ''}`}>
      <div className="splash-rocket">
        <svg width="80" height="80" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C13 5 10 9.5 10 16v1l6 5 6-5v-1C22 9.5 19 5 16 2z" fill="#0078d4"/>
          <path d="M16 2C13 5 10 9 10 12h12C22 9 19 5 16 2z" fill="#005ba1"/>
          <circle cx="16" cy="15" r="3.2" fill="#1a9fff" opacity="0.25"/>
          <circle cx="16" cy="15" r="2.2" fill="white" opacity="0.9"/>
          <circle cx="15" cy="14" r="0.7" fill="white"/>
          <path d="M10 17L5.5 24 10 22z" fill="#005ba1"/>
          <path d="M22 17L26.5 24 22 22z" fill="#005ba1"/>
          <rect x="13" y="21" width="6" height="2" rx="0.5" fill="#003f75"/>
          <g className="splash-flame">
            <path d="M13 23 C12.5 26 13.5 30 16 30 C18.5 30 19.5 26 19 23z" fill="#ff8c00"/>
            <path d="M14 23 C13.7 25.5 14.5 28.5 16 28.5 C17.5 28.5 18.3 25.5 18 23z" fill="#ffbc00"/>
            <path d="M15 23 C14.8 25 15.4 27 16 27 C16.6 27 17.2 25 17 23z" fill="#fff5c0"/>
          </g>
        </svg>
      </div>
      <div className="splash-title"><span>Rocket</span> Test</div>
      <div className="splash-dots">
        <span/><span/><span/>
      </div>
    </div>
  )
}

function WinControls() {
  const [maximized, setMaximized] = useState(false)
  const api = window.winControls

  useEffect(() => {
    api?.isMaximized().then(setMaximized)
    const cleanup = api?.onMaximized(setMaximized)
    return cleanup
  }, [])

  if (!api) return null

  return (
    <div className="win-controls">
      <button className="win-btn win-minimize" title="Minimize" onClick={() => api.minimize()}>
        <svg width="10" height="1" viewBox="0 0 10 1">
          <rect width="10" height="1" fill="currentColor"/>
        </svg>
      </button>
      <button className="win-btn win-maximize" title={maximized ? 'Restore' : 'Maximize'} onClick={() => api.toggleMax()}>
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0" y="2" width="8" height="8"/>
            <polyline points="2,2 2,0 10,0 10,8 8,8"/>
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0" y="0" width="10" height="10"/>
          </svg>
        )}
      </button>
      <button className="win-btn win-close" title="Close" onClick={() => api.close()}>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </button>
    </div>
  )
}

function WelcomeScreen({ onNew }) {
  return (
    <div className="welcome-screen">
      <RocketLogo size={52} />
      <div className="welcome-title">Rocket Test</div>
      <div className="welcome-sub">Select a request from the Explorer or start a new one</div>
      <button className="btn-primary welcome-new-btn" onClick={onNew}>
        New Request
      </button>
      <div className="welcome-hints">
        <span className="welcome-hint"><kbd>Cmd</kbd><kbd>Enter</kbd> Send request</span>
        <span className="welcome-hint-sep">·</span>
        <span className="welcome-hint">Click any saved request to load it</span>
      </div>
    </div>
  )
}

export default function App() {
  const [request, setRequest]           = useState(DEFAULT_REQUEST)
  const [response, setResponse]         = useState(null)
  const [loading, setLoading]           = useState(false)
  const [collections, setCollections]   = useState([])
  const [envConfig, setEnvConfig]       = useState({ activeId: null, environments: [] })
  const [actMode, setActMode]           = useState('collections')
  const [mainMode, setMainMode]         = useState('request')
  const [securityResults, setSecurityResults] = useState(null)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isDragging, setIsDragging]     = useState(false)
  const [activeReq, setActiveReq]       = useState(null)
  const [started, setStarted]           = useState(false)
  const [splashHiding, setSplashHiding] = useState(false)
  const [splashDone, setSplashDone]     = useState(false)
  const [toasts, setToasts]             = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const sidebarMode = SIDEBAR_MODES.includes(actMode) ? actMode : 'collections'

  const activeEnvVars = envConfig.environments.find(e => e.id === envConfig.activeId)?.vars || []

  useEffect(() => {
    Promise.all([
      storage.getCollections(),
      storage.getEnv(),
    ]).then(([cols, raw]) => {
      setCollections(cols)
      if (Array.isArray(raw) && raw.length > 0) {
        const id = 'env-' + Date.now()
        setEnvConfig({ activeId: id, environments: [{ id, name: 'Default', vars: raw }] })
      } else if (raw?.environments) {
        setEnvConfig(raw)
      }
      // Start fade-out, then fully unmount splash
      setSplashHiding(true)
      setTimeout(() => setSplashDone(true), 360)
    })
  }, [])

  const handleSend = useCallback(async () => {
    if (!request.url.trim()) return
    setLoading(true)
    setResponse(null)
    setSecurityResults(null)
    const result = await sendRequest(request, activeEnvVars)
    setResponse(result)
    setSecurityResults(scanResponseHeaders(result.headers || {}))

    const captures = (request.captures || []).filter(c => c.varName?.trim() && c.path?.trim())
    if (captures.length && result.data != null && !result.error && envConfig.activeId) {
      const updatedVars = [...activeEnvVars]
      const captured = []
      captures.forEach(({ varName, path }) => {
        const value = resolvePath(result.data, path.trim())
        if (value === undefined || value === null) return
        const strVal = String(value)
        const idx = updatedVars.findIndex(v => v.key === varName.trim())
        if (idx >= 0) updatedVars[idx] = { ...updatedVars[idx], value: strVal }
        else updatedVars.push({ key: varName.trim(), value: strVal, enabled: true })
        captured.push(varName.trim())
      })
      if (captured.length) {
        const newConfig = {
          ...envConfig,
          environments: envConfig.environments.map(e =>
            e.id === envConfig.activeId ? { ...e, vars: updatedVars } : e
          ),
        }
        setEnvConfig(newConfig)
        await storage.saveEnv(newConfig)
        toast(`${captured.length} variable${captured.length > 1 ? 's' : ''} captured`, 'success')
      }
    }

    setLoading(false)
  }, [request, activeEnvVars, envConfig, toast])

  const handleLoadRequest = useCallback((req, colId) => {
    setRequest({
      method:   req.method   || 'GET',
      url:      req.url      || '',
      headers:  req.headers?.length ? req.headers : [{ key: '', value: '', enabled: true }],
      params:   req.params?.length  ? req.params  : [{ key: '', value: '', enabled: true }],
      body:     req.body     || '',
      auth:     req.auth     || { type: 'none', token: '', username: '', password: '' },
      captures: req.captures || [],
    })
    setActiveReq(colId && req.id ? { id: req.id, colId, name: req.name } : null)
    setResponse(null)
    setSecurityResults(null)
    setMainMode('request')
    setStarted(true)
  }, [])

  const handleSaveRequest = useCallback(async (name, collectionId) => {
    const newReq = {
      id: Date.now().toString(),
      name,
      method:   request.method,
      url:      request.url,
      headers:  request.headers,
      params:   request.params,
      body:     request.body,
      auth:     request.auth,
      captures: request.captures || [],
    }
    const updated = collections.map((col) =>
      col.id === collectionId ? { ...col, requests: [...col.requests, newReq] } : col
    )
    setCollections(updated)
    await storage.saveCollections(updated)
    toast('Request saved')
  }, [request, collections, toast])

  const persist = async (updated) => {
    setCollections(updated)
    await storage.saveCollections(updated)
  }

  const handleAddCollection = useCallback(async (name, callback) => {
    const newCol = { id: Date.now().toString(), name, requests: [] }
    const updated = [...collections, newCol]
    await persist(updated)
    callback?.(newCol.id)
    toast('Collection created')
  }, [collections, toast])

  const handleRenameCollection = useCallback(async (id, name) => {
    await persist(collections.map((c) => c.id === id ? { ...c, name } : c))
    toast('Collection renamed', 'info')
  }, [collections, toast])

  const handleDeleteCollection = useCallback(async (id) => {
    await persist(collections.filter((c) => c.id !== id))
    toast('Collection deleted', 'warning')
  }, [collections, toast])

  const handleAddRequest = useCallback(async (colId, data) => {
    const newReq = { id: Date.now().toString(), headers: [], params: [], body: '', auth: { type: 'none' }, ...data }
    await persist(collections.map((c) =>
      c.id === colId ? { ...c, requests: [...c.requests, newReq] } : c
    ))
    toast('Request added')
  }, [collections, toast])

  const handleEditRequest = useCallback(async (colId, reqId, data) => {
    await persist(collections.map((c) =>
      c.id === colId
        ? { ...c, requests: c.requests.map((r) => r.id === reqId ? { ...r, ...data } : r) }
        : c
    ))
  }, [collections])

  const handleDeleteRequest = useCallback(async (colId, reqId) => {
    if (activeReq?.id === reqId) setActiveReq(null)
    await persist(collections.map((c) =>
      c.id === colId ? { ...c, requests: c.requests.filter((r) => r.id !== reqId) } : c
    ))
    toast('Request deleted', 'warning')
  }, [collections, activeReq, toast])

  const handleUpdateRequest = useCallback(async () => {
    if (!activeReq) return
    const updated = collections.map((c) =>
      c.id === activeReq.colId
        ? { ...c, requests: c.requests.map((r) =>
            r.id === activeReq.id
              ? { ...r, method: request.method, url: request.url, headers: request.headers, params: request.params, body: request.body, auth: request.auth, captures: request.captures || [] }
              : r
          )}
        : c
    )
    setCollections(updated)
    await storage.saveCollections(updated)
    toast(`${request.method} updated`)
  }, [activeReq, request, collections, toast])

  const handleDuplicateRequest = useCallback(async (colId, reqId) => {
    const col = collections.find((c) => c.id === colId)
    const req = col?.requests.find((r) => r.id === reqId)
    if (!req) return
    const existing = new Set(col.requests.map((r) => r.name))
    const base = `${req.name} (copy)`
    let name = base
    let n = 2
    while (existing.has(name)) name = `${base} ${n++}`
    const copy = { ...req, id: Date.now().toString(), name }
    await persist(collections.map((c) =>
      c.id === colId ? { ...c, requests: [...c.requests, copy] } : c
    ))
    toast('Request duplicated')
  }, [collections, toast])

  const handleEnvChange = useCallback(async (newConfig) => {
    setEnvConfig(newConfig)
    await storage.saveEnv(newConfig)
  }, [])

  const handleActClick = (mode) => {
    if (mode === 'batch') {
      setMainMode('batch')
      setActMode('batch')
    } else if (mode === 'env') {
      setMainMode('env')
      setActMode('env')
    } else {
      setMainMode('request')
      setActMode(mode)
    }
  }

  const startSidebarResize = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    setIsDragging(true)

    const onMove = (me) => {
      const next = Math.min(520, Math.max(160, startW + me.clientX - startX))
      setSidebarWidth(next)
    }
    const onUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const secWarnings = securityResults?.filter((r) => !r.present).length || 0

  return (
    <div className="app">
      {!splashDone && <SplashScreen hiding={splashHiding} />}
      <header className="title-bar">
        <span className="title-logo">
          <RocketLogo size={18} />
          <strong>Rocket</strong> Test
        </span>
        <WinControls />
      </header>

      <div className="app-body">
        <nav className="actbar">
          {[
            { id: 'collections', icon: ActIcons.collections, title: 'Collections' },
            { id: 'batch',       icon: ActIcons.batch,       title: 'Batch Runner' },
            { id: 'env',         icon: ActIcons.env,         title: 'Environment Variables' },
          ].map(({ id, icon, title }) => (
            <button
              key={id}
              className={`actbar-btn ${actMode === id ? 'active' : ''}`}
              title={title}
              onClick={() => handleActClick(id)}
            >
              {icon}
            </button>
          ))}
        </nav>

        {SIDEBAR_MODES.includes(actMode) && (
          <>
            <Sidebar
              sidebarMode={sidebarMode}
              collections={collections}
              onLoadRequest={handleLoadRequest}
              onAddCollection={handleAddCollection}
              onRenameCollection={handleRenameCollection}
              onDeleteCollection={handleDeleteCollection}
              onAddRequest={handleAddRequest}
              onEditRequest={handleEditRequest}
              onDeleteRequest={handleDeleteRequest}
              onDuplicateRequest={handleDuplicateRequest}
              width={sidebarWidth}
            />
            <div
              className={`sidebar-resize-handle ${isDragging ? 'dragging' : ''}`}
              onMouseDown={startSidebarResize}
            />
          </>
        )}

        <div className="main-area">
          {mainMode === 'request' && !started && (
            <WelcomeScreen onNew={() => { setStarted(true); setRequest(DEFAULT_REQUEST); setActiveReq(null) }} />
          )}
          {mainMode === 'request' && started && (
            <VerticalSplit
              top={
                <RequestBuilder
                  request={request}
                  onChange={setRequest}
                  onSend={handleSend}
                  onSave={handleSaveRequest}
                  onUpdate={handleUpdateRequest}
                  onClose={() => setStarted(false)}
                  loading={loading}
                  collections={collections}
                  activeReq={activeReq}
                  response={response}
                  envVars={activeEnvVars}
                />
              }
              bottom={
                <ResponseViewer
                  response={response}
                  loading={loading}
                  securityResults={securityResults}
                />
              }
            />
          )}
          {mainMode === 'batch' && <BatchRunner collections={collections} envConfig={envConfig} activeEnvVars={activeEnvVars} />}
          {mainMode === 'env' && <EnvPanel envConfig={envConfig} onChange={handleEnvChange} />}
        </div>
      </div>

      <div className="statusbar">
        <span className="statusbar-item">Rocket Test</span>
        {response && (
          <>
            <span className="statusbar-item">
              Status: {response.status} · {response.time}ms
            </span>
            {secWarnings > 0 && (
              <span className="statusbar-item" style={{ color: '#ffcc00' }}>
                ⚠ {secWarnings} security warning{secWarnings > 1 ? 's' : ''}
              </span>
            )}
          </>
        )}
        <span className="statusbar-item" style={{ marginLeft: 'auto' }}>
          {(() => {
            const active = envConfig.environments.find(e => e.id === envConfig.activeId)
            return active
              ? <span style={{ color: '#4ec9b0' }}>Env: {active.name}</span>
              : <span style={{ color: 'var(--vsc-text-muted)' }}>No active env</span>
          })()}
        </span>
        <span className="statusbar-item">
          {collections.length} collection{collections.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
