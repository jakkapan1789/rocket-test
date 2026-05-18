const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

const DATA_DIR = path.join(app.getPath("userData"), "rocket-api-data");
const COLLECTIONS_FILE = path.join(DATA_DIR, "collections.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const ENV_FILE = path.join(DATA_DIR, "env.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error("Error reading", filePath, e);
  }
  return defaultValue;
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#1e1e1e",
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Show window only after first paint — eliminates white flash
  win.once("ready-to-show", () => win.show());

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  // Notify renderer when maximize state changes
  win.on("maximize", () => win.webContents.send("win:maximized", true));
  win.on("unmaximize", () => win.webContents.send("win:maximized", false));

  // Window control IPC
  ipcMain.handle("win:minimize", () => win.minimize());
  ipcMain.handle("win:toggleMax", () =>
    win.isMaximized() ? win.unmaximize() : win.maximize(),
  );
  ipcMain.handle("win:close", () => win.close());
  ipcMain.handle("win:isMaximized", () => win.isMaximized());
}

app.whenReady().then(() => {
  ensureDataDir();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Collections IPC
ipcMain.handle("collections:get", () => {
  return readJSON(COLLECTIONS_FILE, [
    {
      id: "default",
      name: "My Collection",
      requests: [
        {
          id: "req-1",
          name: "JSONPlaceholder Posts",
          method: "GET",
          url: "https://jsonplaceholder.typicode.com/posts",
          headers: [],
          params: [],
          body: "",
          auth: { type: "none" },
        },
        {
          id: "req-2",
          name: "HTTPBin GET",
          method: "GET",
          url: "https://httpbin.org/get",
          headers: [],
          params: [],
          body: "",
          auth: { type: "none" },
        },
      ],
    },
  ]);
});

ipcMain.handle("collections:save", (_, collections) => {
  writeJSON(COLLECTIONS_FILE, collections);
  return true;
});

// History IPC
ipcMain.handle("history:get", () => {
  return readJSON(HISTORY_FILE, []);
});

ipcMain.handle("history:add", (_, entry) => {
  const history = readJSON(HISTORY_FILE, []);
  history.unshift(entry);
  const trimmed = history.slice(0, 200);
  writeJSON(HISTORY_FILE, trimmed);
  return true;
});

ipcMain.handle("history:clear", () => {
  writeJSON(HISTORY_FILE, []);
  return true;
});

// Stats IPC
ipcMain.handle("stats:get", () => {
  return readJSON(STATS_FILE, { requests: [] });
});

ipcMain.handle("stats:add", (_, entry) => {
  const stats = readJSON(STATS_FILE, { requests: [] });
  stats.requests.push(entry);
  if (stats.requests.length > 500) {
    stats.requests = stats.requests.slice(-500);
  }
  writeJSON(STATS_FILE, stats);
  return true;
});

// Env IPC
ipcMain.handle("env:get", () => {
  return readJSON(ENV_FILE, []);
});

ipcMain.handle("env:save", (_, vars) => {
  writeJSON(ENV_FILE, vars);
  return true;
});
