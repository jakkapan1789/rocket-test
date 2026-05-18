# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Vite on :5173) + Electron concurrently
npm run build    # Vite build → electron-builder → dist-electron/
```

No lint or test commands are configured.

## Architecture

**Rocket Test** is an Electron + React (Vite) API testing desktop app — think lightweight Postman.

### Process boundary

```
Renderer (React/Vite)
  └─ src/services/storage.js       → calls window.electronAPI.*
  └─ src/services/apiClient.js     → axios (runs in renderer, no IPC)

Preload (src/preload/preload.js)   → contextBridge exposes electronAPI + winControls

Main (src/main/main.js)            → ipcMain handlers → JSON files in userData/rocket-api-data/
```

`contextIsolation: true`, `nodeIntegration: false` — the renderer has zero Node access. All persistence goes through IPC.

### Renderer state model

All application state lives in `App.jsx`. It is the single source of truth and passes handlers down as props — there is no global store (no Redux, no Context API for data).

The active request object shape (defined as `DEFAULT_REQUEST` in `App.jsx`):
```js
{ method, url, headers: [{key, value, enabled}], params: [{key, value, enabled}],
  body, auth: {type, token, username, password, keyName, keyValue}, captures: [{varName, path}] }
```

### Variable interpolation

`{{varName}}` syntax is used throughout. Two layers:
1. **UI display** — `HighlightInput` component in `RequestBuilder.jsx` highlights variables with a backdrop/overlay technique (transparent input text + colored backdrop mark elements).
2. **Runtime resolution** — `interpolateVars()` in `apiClient.js` substitutes variables from the active environment before sending.

### Data persistence

Stored as JSON files in Electron's `userData` directory:
- `collections.json` — saved requests grouped by collection
- `env.json` — environment configs with `{ activeId, environments: [{id, name, vars}] }`
- `history.json` — capped at 200 entries
- `stats.json` — capped at 500 entries

### Key components

- **`App.jsx`** — root state, send logic, capture-after-response logic, environment substitution trigger
- **`RequestBuilder.jsx`** — URL bar, tabs (Params/Headers/Body/Auth/Extract), `HighlightInput` for `{{var}}` coloring, `ExtractEditor` for post-response variable capture rules
- **`EnvPanel.jsx`** — CRUD for environment variables
- **`BatchRunner.jsx`** — drag-to-order flow, runs a sequence of saved requests
- **`apiClient.js`** — interpolates vars then calls axios; always `validateStatus: () => true` (no thrown errors for 4xx/5xx)
- **`securityScanner.js`** — checks response headers for security headers, returns pass/warn results shown in `ResponseViewer`

### Styling

Single CSS file: `src/renderer/styles.css`. VS Code dark theme color palette via CSS custom properties (`--vsc-*`). No CSS modules or styled-components.
