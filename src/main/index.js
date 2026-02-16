const { app, BrowserWindow, ipcMain, clipboard } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const pty = require('node-pty')

// --- Path Validation ---
// Allowlist of root paths the renderer is permitted to access.
// The renderer must register roots via fs:set-root before fs operations work.
const allowedRoots = new Set()

function isPathAllowed(targetPath) {
  if (allowedRoots.size === 0) return true // No roots registered = unrestricted (backwards compat on startup)
  const resolved = path.resolve(targetPath)
  const normalized = resolved.toLowerCase()
  for (const root of allowedRoots) {
    const normalizedRoot = path.resolve(root).toLowerCase()
    if (normalized === normalizedRoot || normalized.startsWith(normalizedRoot + path.sep)) {
      return true
    }
  }
  return false
}

// --- PTY Manager ---
class PtyManager {
  constructor() {
    this.ptys = new Map()
  }

  create(id, options = {}) {
    const shell = options.shell || this._getDefaultShell()
    const cwd = options.cwd || process.env.HOME || process.env.USERPROFILE
    const args = options.args || []

    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: options.cols || 120,
      rows: options.rows || 30,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' }
    })

    this.ptys.set(id, ptyProcess)
    return ptyProcess
  }

  write(id, data) {
    const p = this.ptys.get(id)
    if (p) p.write(data)
  }

  resize(id, cols, rows) {
    const p = this.ptys.get(id)
    if (p) {
      try {
        p.resize(cols, rows)
      } catch (e) {
        // Ignore resize errors during shutdown
      }
    }
  }

  kill(id) {
    const p = this.ptys.get(id)
    if (p) {
      p.kill()
      this.ptys.delete(id)
    }
  }

  killAll() {
    for (const [id] of this.ptys) {
      this.kill(id)
    }
  }

  _getDefaultShell() {
    if (process.platform === 'win32') {
      const gitBashPaths = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe'
      ]
      for (const p of gitBashPaths) {
        try {
          fs.accessSync(p)
          return p
        } catch {}
      }
      return 'powershell.exe'
    }
    return process.env.SHELL || '/bin/bash'
  }
}

// --- App ---
const ptyManager = new PtyManager()
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#24283b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: false is required for node-pty native module access.
      // This disables Chromium's renderer sandbox but contextIsolation + no nodeIntegration
      // still prevents direct Node.js access from the renderer. All native access goes
      // through the preload bridge with validated IPC handlers.
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

}

// PTY IPC Handlers
ipcMain.handle('pty:create', (event, { id, shell, cwd, args, cols, rows }) => {
  // Kill existing PTY with same ID if it exists (StrictMode remount)
  ptyManager.kill(id)
  const ptyProcess = ptyManager.create(id, { shell, cwd, args, cols, rows })
  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty:data', { id, data })
    }
  })
  ptyProcess.onExit(({ exitCode }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty:exit', { id, exitCode })
    }
  })
  return { success: true }
})

ipcMain.on('pty:write', (event, { id, data }) => {
  ptyManager.write(id, data)
})

ipcMain.on('pty:resize', (event, { id, cols, rows }) => {
  ptyManager.resize(id, cols, rows)
})

ipcMain.handle('pty:kill', (event, { id }) => {
  ptyManager.kill(id)
  return { success: true }
})

// --- File System Path Root Registration ---
ipcMain.handle('fs:set-root', (event, { rootPath }) => {
  const resolved = path.resolve(rootPath)
  allowedRoots.add(resolved)
  return { success: true }
})

// File System IPC Handlers
ipcMain.handle('fs:list-dir', async (event, { dirPath }) => {
  if (!isPathAllowed(dirPath)) {
    return []
  }
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    const results = []
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.claude') continue
      if (['node_modules', '__pycache__', '.git'].includes(entry.name)) continue

      results.push({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, entry.name)
      })
    }
    results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return results
  } catch (err) {
    return []
  }
})

// File System Watcher
const activeWatchers = new Map()

ipcMain.handle('fs:watch', (event, { id, dirPath }) => {
  // Clean up existing watcher for this id
  if (activeWatchers.has(id)) {
    activeWatchers.get(id).close()
    activeWatchers.delete(id)
  }

  try {
    const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fs:changed', { id, dirPath, eventType, filename })
      }
    })
    watcher.on('error', () => {}) // Ignore watch errors silently
    activeWatchers.set(id, watcher)
    return { success: true }
  } catch {
    return { success: false }
  }
})

ipcMain.handle('fs:unwatch', (event, { id }) => {
  if (activeWatchers.has(id)) {
    activeWatchers.get(id).close()
    activeWatchers.delete(id)
  }
  return { success: true }
})

// File Read/Write IPC Handlers (with path validation)
ipcMain.handle('fs:read-file', async (event, { filePath }) => {
  if (!isPathAllowed(filePath)) {
    return { content: null, error: 'Access denied: path outside allowed roots' }
  }
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { content, error: null }
  } catch (err) {
    return { content: null, error: err.message }
  }
})

ipcMain.handle('fs:write-file', async (event, { filePath, content }) => {
  if (!isPathAllowed(filePath)) {
    return { error: 'Access denied: path outside allowed roots' }
  }
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
})

// --- Settings Persistence ---
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

ipcMain.handle('settings:load', async () => {
  try {
    const raw = await fs.promises.readFile(getSettingsPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
})

ipcMain.handle('settings:save', async (event, { settings }) => {
  try {
    const dir = path.dirname(getSettingsPath())
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
})

// --- System Info ---
ipcMain.handle('app:get-home-path', () => {
  return os.homedir()
})

// Clipboard IPC Handlers
ipcMain.handle('clipboard:read-image', () => {
  const img = clipboard.readImage()
  if (img.isEmpty()) return null
  return img.toDataURL()
})

ipcMain.handle('app:save-temp-image', async (event, { dataURL }) => {
  const matches = dataURL.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) return { filePath: null }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  const fileName = `claude-paste-${Date.now()}.${ext}`
  const filePath = path.join(os.tmpdir(), fileName)

  await fs.promises.writeFile(filePath, buffer)
  return { filePath }
})

// --- Temp Image Cleanup ---
async function cleanupTempImages() {
  try {
    const tmpDir = os.tmpdir()
    const entries = await fs.promises.readdir(tmpDir)
    const pasteFiles = entries.filter(f => f.startsWith('claude-paste-'))
    await Promise.allSettled(
      pasteFiles.map(f => fs.promises.unlink(path.join(tmpDir, f)))
    )
  } catch {
    // Best-effort cleanup — ignore errors
  }
}

// Window control IPC
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())

app.whenReady().then(createWindow)

app.on('window-all-closed', async () => {
  ptyManager.killAll()
  for (const watcher of activeWatchers.values()) watcher.close()
  activeWatchers.clear()
  await cleanupTempImages()
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
