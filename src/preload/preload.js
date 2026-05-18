const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('winControls', {
  minimize:     () => ipcRenderer.invoke('win:minimize'),
  toggleMax:    () => ipcRenderer.invoke('win:toggleMax'),
  close:        () => ipcRenderer.invoke('win:close'),
  isMaximized:  () => ipcRenderer.invoke('win:isMaximized'),
  onMaximized:  (cb) => {
    ipcRenderer.on('win:maximized', (_e, val) => cb(val))
    return () => ipcRenderer.removeAllListeners('win:maximized')
  },
})

contextBridge.exposeInMainWorld('electronAPI', {
  collections: {
    get: () => ipcRenderer.invoke('collections:get'),
    save: (data) => ipcRenderer.invoke('collections:save', data),
  },
  history: {
    get: () => ipcRenderer.invoke('history:get'),
    add: (entry) => ipcRenderer.invoke('history:add', entry),
    clear: () => ipcRenderer.invoke('history:clear'),
  },
  stats: {
    get: () => ipcRenderer.invoke('stats:get'),
    add: (entry) => ipcRenderer.invoke('stats:add', entry),
  },
  env: {
    get: () => ipcRenderer.invoke('env:get'),
    save: (vars) => ipcRenderer.invoke('env:save', vars),
  },
})
