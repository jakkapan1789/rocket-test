import { useState, useRef, useEffect } from 'react'

// ── Icons ─────────────────────────────────────────────────────────────────────
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }

const Icon = {
  chevron: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M3 7.5C3 6.1 4.1 5 5.5 5H9l2 2h7.5C19.9 7 21 8.1 21 9.5v9c0 1.4-1.1 2.5-2.5 2.5h-13C4.1 21 3 19.9 3 18.5V7.5z"/>
    </svg>
  ),
  folderOpen: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M3 7.5C3 6.1 4.1 5 5.5 5H9l2 2h7.5C19.9 7 21 8.1 21 9.5V11H3V7.5z"/>
      <path d="M3 11h18l-2 9H5l-2-9z"/>
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" {...S}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" {...S}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  ),
  newFile: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  newFolder: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M3 7.5C3 6.1 4.1 5 5.5 5H9l2 2h7.5C19.9 7 21 8.1 21 9.5v9c0 1.4-1.1 2.5-2.5 2.5h-13C4.1 21 3 19.9 3 18.5V7.5z"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" {...S}>
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

// ── Helpers ───────────────────────────────────────────────────────────────────
const methodCls = (m) => `method-badge m-${(m || 'GET').toUpperCase()}`

const statusCls = (s) => {
  const base = 'status-badge '
  if (!s) return base + 'status-0xx'
  if (s < 300) return base + 'status-2xx'
  if (s < 400) return base + 'status-3xx'
  if (s < 500) return base + 'status-4xx'
  return base + 'status-5xx'
}

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const shortUrl = (url = '', max = 34) => {
  try {
    const u = new URL(url)
    const s = u.hostname + u.pathname
    return s.length > max ? s.slice(0, max) + '…' : s
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url
  }
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ color: '#e2b714', marginTop: 1, flexShrink: 0 }}>{Icon.warn}</span>
        <div style={{ flex: 1 }}>
          <div className="modal-title" style={{ marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--vsc-text-dim)', lineHeight: 1.6 }}>{message}</div>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose} autoFocus>Cancel</button>
        <button className="btn-danger" onClick={() => { onConfirm(); onClose() }}>Delete</button>
      </div>
    </Modal>
  )
}

// ── Request form modal ────────────────────────────────────────────────────────
function RequestModal({ title, initial, onConfirm, onClose }) {
  const [name,   setName]   = useState(initial?.name   || '')
  const [method, setMethod] = useState(initial?.method || 'GET')
  const [url,    setUrl]    = useState(initial?.url    || '')

  const submit = () => {
    if (!name.trim() || !url.trim()) return
    onConfirm({ name: name.trim(), method, url: url.trim() })
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">{title}</div>

      <div>
        <label className="modal-label">Name</label>
        <input className="modal-input" placeholder="Request name" value={name}
          onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div>
          <label className="modal-label">Method</label>
          <select className="modal-select" style={{ width: 'auto' }} value={method}
            onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="modal-label">URL</label>
          <input className="modal-input" placeholder="https://api.example.com/…" value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!name.trim() || !url.trim()}>
          {initial ? 'Save' : 'Add'}
        </button>
      </div>
    </Modal>
  )
}

// ── New Request — pick collection first ───────────────────────────────────────
function AddRequestPickModal({ collections, onConfirm, onClose }) {
  const [colId,  setColId]  = useState(collections[0]?.id || '')
  const [name,   setName]   = useState('')
  const [method, setMethod] = useState('GET')
  const [url,    setUrl]    = useState('')

  if (!collections.length) {
    return (
      <Modal onClose={onClose}>
        <div className="modal-title">New Request</div>
        <div style={{ fontSize: 12, color: 'var(--vsc-text-dim)' }}>
          Create a collection first before adding requests.
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </Modal>
    )
  }

  const submit = () => {
    if (!name.trim() || !url.trim() || !colId) return
    onConfirm(colId, { name: name.trim(), method, url: url.trim() })
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">New Request</div>

      <div>
        <label className="modal-label">Collection</label>
        <select className="modal-select" value={colId} onChange={(e) => setColId(e.target.value)}>
          {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="modal-label">Name</label>
        <input className="modal-input" placeholder="Request name" value={name}
          onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div>
          <label className="modal-label">Method</label>
          <select className="modal-select" style={{ width: 'auto' }} value={method}
            onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="modal-label">URL</label>
          <input className="modal-input" placeholder="https://api.example.com/…" value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!name.trim() || !url.trim()}>
          Add
        </button>
      </div>
    </Modal>
  )
}

// ── Inline rename ─────────────────────────────────────────────────────────────
function RenameInput({ initial, onConfirm, onCancel }) {
  const [val, setVal] = useState(initial)
  const ref = useRef(null)
  useEffect(() => { ref.current?.select() }, [])
  const commit = () => val.trim() ? onConfirm(val.trim()) : onCancel()
  return (
    <input ref={ref} className="tree-rename-input" value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel() }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()} />
  )
}

// ── New Collection name input ──────────────────────────────────────────────────
function CollectionNameInput({ onConfirm, onCancel }) {
  const [val, setVal] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <>
      <input ref={ref} className="modal-input" placeholder="Collection name" value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) onConfirm(val.trim()); if (e.key === 'Escape') onCancel() }} />
      <div className="modal-actions" style={{ marginTop: 4 }}>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={!val.trim()} onClick={() => val.trim() && onConfirm(val.trim())}>
          Create
        </button>
      </div>
    </>
  )
}

// ── Collections panel ─────────────────────────────────────────────────────────
function CollectionList({
  collections, onLoadRequest,
  onAddCollection, onRenameCollection, onDeleteCollection,
  onAddRequest, onEditRequest, onDeleteRequest, onDuplicateRequest,
}) {
  const [expanded,   setExpanded]   = useState({})
  const [renamingCol, setRenamingCol] = useState(null)
  const [modal,      setModal]      = useState(null)
  // { type: 'addCol'|'addReqPick'|'addReq'|'editReq'|'confirmCol'|'confirmReq',
  //   colId?, req?, name?, reqId? }

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))
  const expand = (id) => setExpanded((p) => ({ ...p, [id]: true }))

  const handleAddCollection = (name) => {
    onAddCollection(name, (id) => expand(id))
    setModal(null)
  }

  return (
    <>
      {/* Header */}
      <div className="sidebar-title">
        <span>Explorer</span>
        <div className="sidebar-title-actions">
          <button className="sidebar-icon-btn" title="New Request"
            onClick={() => setModal({ type: 'addReqPick' })}>
            {Icon.newFile}
          </button>
          <button className="sidebar-icon-btn" title="New Collection"
            onClick={() => setModal({ type: 'addCol' })}>
            {Icon.newFolder}
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="sidebar-body">
        {collections.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 20, opacity: 0.4 }}>📂</div>
            <div style={{ fontSize: 11, color: 'var(--vsc-text-muted)' }}>No collections</div>
            <button className="btn-secondary"
              style={{ marginTop: 8, fontSize: 11, padding: '4px 12px' }}
              onClick={() => setModal({ type: 'addCol' })}>
              New Collection
            </button>
          </div>
        )}

        {collections.map((col) => (
          <div key={col.id}>
            {/* Collection row */}
            <div className="tree-row tree-collection"
              onClick={() => !renamingCol && toggle(col.id)}>
              <span className={`tree-chevron ${expanded[col.id] ? 'open' : ''}`}>{Icon.chevron}</span>
              <span className="tree-folder-icon">
                {expanded[col.id] ? Icon.folderOpen : Icon.folder}
              </span>

              {renamingCol === col.id ? (
                <RenameInput
                  initial={col.name}
                  onConfirm={(name) => { onRenameCollection(col.id, name); setRenamingCol(null) }}
                  onCancel={() => setRenamingCol(null)}
                />
              ) : (
                <span className="tree-label">{col.name}</span>
              )}

              {renamingCol !== col.id && (
                <>
                  <span className="tree-count">{col.requests.length}</span>
                  <div className="tree-row-actions">
                    <button className="tree-action" title="Add request"
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'addReq', colId: col.id }); expand(col.id) }}>
                      {Icon.plus}
                    </button>
                    <button className="tree-action" title="Rename"
                      onClick={(e) => { e.stopPropagation(); setRenamingCol(col.id) }}>
                      {Icon.edit}
                    </button>
                    <button className="tree-action danger" title="Delete collection"
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'confirmCol', colId: col.id, name: col.name }) }}>
                      {Icon.trash}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Request rows */}
            {expanded[col.id] && (
              <>
                {col.requests.length === 0 && (
                  <div style={{ padding: '4px 36px', fontSize: 11, color: 'var(--vsc-text-muted)' }}>
                    No requests
                  </div>
                )}
                {col.requests.map((req) => (
                  <div key={req.id} className="tree-row tree-request"
                    onClick={() => onLoadRequest(req, col.id)}>
                    <span className={methodCls(req.method)}>{req.method}</span>
                    <span className="tree-label" style={{ fontSize: 13 }}>{req.name}</span>
                    <div className="tree-row-actions">
                      <button className="tree-action" title="Duplicate"
                        onClick={(e) => { e.stopPropagation(); onDuplicateRequest(col.id, req.id) }}>
                        {Icon.copy}
                      </button>
                      <button className="tree-action" title="Edit"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'editReq', colId: col.id, req }) }}>
                        {Icon.edit}
                      </button>
                      <button className="tree-action danger" title="Delete"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'confirmReq', colId: col.id, reqId: req.id, name: req.name }) }}>
                        {Icon.trash}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Modals ── */}

      {modal?.type === 'addCol' && (
        <Modal onClose={() => setModal(null)}>
          <div className="modal-title">New Collection</div>
          <div>
            <label className="modal-label">Name</label>
            <CollectionNameInput
              onConfirm={handleAddCollection}
              onCancel={() => setModal(null)}
            />
          </div>
        </Modal>
      )}

      {modal?.type === 'addReqPick' && (
        <AddRequestPickModal
          collections={collections}
          onConfirm={(colId, data) => { onAddRequest(colId, data); expand(colId) }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'addReq' && (
        <RequestModal
          title="Add Request"
          onConfirm={(data) => onAddRequest(modal.colId, data)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'editReq' && (
        <RequestModal
          title="Edit Request"
          initial={modal.req}
          onConfirm={(data) => onEditRequest(modal.colId, modal.req.id, data)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'confirmCol' && (
        <ConfirmModal
          title="Delete Collection"
          message={`Delete "${modal.name}" and all its requests? This action cannot be undone.`}
          onConfirm={() => onDeleteCollection(modal.colId)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'confirmReq' && (
        <ConfirmModal
          title="Delete Request"
          message={`Delete "${modal.name}"? This action cannot be undone.`}
          onConfirm={() => onDeleteRequest(modal.colId, modal.reqId)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

// ── History panel ─────────────────────────────────────────────────────────────
function HistoryList({ history, onLoadRequest, onClearHistory }) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <div className="sidebar-title">
        <span>History</span>
        {history.length > 0 && (
          <div className="sidebar-title-actions">
            <button className="sidebar-icon-btn" title="Clear history"
              onClick={() => setShowConfirm(true)}>
              {Icon.trash}
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-body">
        {history.length === 0 && (
          <div className="empty-state">
            <div style={{ opacity: 0.4 }}>{Icon.clock}</div>
            <div style={{ fontSize: 11, color: 'var(--vsc-text-muted)' }}>No history yet</div>
          </div>
        )}
        {history.map((e) => (
          <div key={e.id} className="history-row"
            onClick={() => onLoadRequest({ method: e.method, url: e.url })}>
            <div className="history-row-top">
              <span className={methodCls(e.method)}>{e.method}</span>
              <span className={statusCls(e.status)}>{e.status || 'ERR'}</span>
            </div>
            <div className="history-url" title={e.url}>{shortUrl(e.url)}</div>
            <div className="history-meta">
              <span>{e.time}ms</span>
              <span>{fmtTime(e.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Clear History"
          message="Remove all request history? This action cannot be undone."
          onConfirm={onClearHistory}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}

// ── Sidebar (exported) ────────────────────────────────────────────────────────
export default function Sidebar({
  sidebarMode, collections, history, width,
  onLoadRequest, onClearHistory,
  onAddCollection, onRenameCollection, onDeleteCollection,
  onAddRequest, onEditRequest, onDeleteRequest, onDuplicateRequest,
}) {
  return (
    <aside className="sidebar" style={width ? { width, minWidth: width, maxWidth: width } : undefined}>
      {sidebarMode === 'collections' ? (
        <CollectionList
          collections={collections}
          onLoadRequest={onLoadRequest}
          onAddCollection={onAddCollection}
          onRenameCollection={onRenameCollection}
          onDeleteCollection={onDeleteCollection}
          onAddRequest={onAddRequest}
          onEditRequest={onEditRequest}
          onDeleteRequest={onDeleteRequest}
          onDuplicateRequest={onDuplicateRequest}
        />
      ) : (
        <HistoryList
          history={history}
          onLoadRequest={onLoadRequest}
          onClearHistory={onClearHistory}
        />
      )}
    </aside>
  )
}
