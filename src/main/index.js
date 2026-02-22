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

// --- Workflow Scanner ---
class WorkflowScanner {
  constructor() {
    this.watchers = new Map()
  }

  async getConfig(projectPath) {
    const configPath = path.join(projectPath, '.claude', 'workflow.json')
    try {
      const raw = await fs.promises.readFile(configPath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  async getWorkflow(projectPath) {
    const config = await this.getConfig(projectPath)
    if (!config || !config.activeWorkflow || !config.workflowsDir) {
      return null
    }

    const workflowDir = path.join(projectPath, config.workflowsDir, config.activeWorkflow)
    const workflowJsonPath = path.join(workflowDir, 'workflow.json')

    try {
      const raw = await fs.promises.readFile(workflowJsonPath, 'utf-8')
      const workflow = JSON.parse(raw)
      return { ...workflow, basePath: workflowDir }
    } catch {
      return null
    }
  }

  async getStepContent(projectPath, stepFile) {
    const config = await this.getConfig(projectPath)
    if (!config) return { content: null, error: 'No workflow config' }

    const filePath = path.join(projectPath, config.workflowsDir, config.activeWorkflow, stepFile)
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return { content, error: null }
    } catch (err) {
      return { content: null, error: err.message }
    }
  }

  async saveStepContent(projectPath, stepFile, content) {
    const config = await this.getConfig(projectPath)
    if (!config) return { error: 'No workflow config' }

    const filePath = path.join(projectPath, config.workflowsDir, config.activeWorkflow, stepFile)
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8')
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  async getProgress(projectPath) {
    const config = await this.getConfig(projectPath)
    if (!config || !config.progressDir) return null

    const progressDir = path.join(projectPath, config.progressDir)
    try {
      const entries = await fs.promises.readdir(progressDir, { withFileTypes: true })
      const features = []

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const currentPath = path.join(progressDir, entry.name, 'current.md')
        try {
          const content = await fs.promises.readFile(currentPath, 'utf-8')
          const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/)
          features.push({
            name: entry.name,
            status: statusMatch ? statusMatch[1] : 'unknown',
            currentFile: currentPath
          })
        } catch {
          features.push({ name: entry.name, status: 'unknown', currentFile: null })
        }
      }

      return { features, progressDir }
    } catch {
      return { features: [], progressDir }
    }
  }

  watchProgress(projectPath, callback) {
    const config = this._getConfigSync(projectPath)
    if (!config || !config.progressDir) return null

    const progressDir = path.join(projectPath, config.progressDir)
    const watchId = `workflow-progress-${projectPath}`

    if (this.watchers.has(watchId)) {
      this.watchers.get(watchId).close()
    }

    try {
      const watcher = fs.watch(progressDir, { recursive: true }, (eventType, filename) => {
        callback({ eventType, filename, progressDir })
      })
      watcher.on('error', () => {})
      this.watchers.set(watchId, watcher)
      return watchId
    } catch {
      return null
    }
  }

  unwatchProgress(watchId) {
    if (this.watchers.has(watchId)) {
      this.watchers.get(watchId).close()
      this.watchers.delete(watchId)
    }
  }

  _getConfigSync(projectPath) {
    const configPath = path.join(projectPath, '.claude', 'workflow.json')
    try {
      const raw = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  async hasWorkflow(projectPath) {
    const config = await this.getConfig(projectPath)
    return config !== null
  }

  async scaffold(projectPath) {
    const claudeDir = path.join(projectPath, '.claude')
    const workflowsDir = path.join(claudeDir, 'docs', 'workflows', 'default', 'steps')
    const agentsDir = path.join(claudeDir, 'agents')
    const progressDir = path.join(claudeDir, 'progress')

    await fs.promises.mkdir(workflowsDir, { recursive: true })
    await fs.promises.mkdir(agentsDir, { recursive: true })
    await fs.promises.mkdir(progressDir, { recursive: true })

    const config = {
      projectRulesFile: 'CLAUDE.md',
      architectureFile: '.claude/docs/ARCHITECTURE.md',
      progressDir: '.claude/progress',
      branching: {
        baseBranch: 'auto',
        featurePrefix: 'feature',
        workPrefix: 'work',
        enforce: 'warn',
        protectedBranches: ['main', 'master'],
        useWorktrees: true,
        worktreeDir: '.worktrees'
      },
      activeWorkflow: 'default',
      workflowsDir: '.claude/docs/workflows'
    }
    await fs.promises.writeFile(
      path.join(claudeDir, 'workflow.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    )

    const workflow = {
      name: 'Default Workflow',
      description: 'Standard feature implementation workflow',
      steps: [
        { id: 'create-plan', title: 'Create Plan', description: 'Technical planning and task decomposition', file: 'steps/01-create-plan.md', order: 1 },
        { id: 'implement-plan', title: 'Implement Plan', description: 'Execute through specialist agents', file: 'steps/02-implement-plan.md', order: 2 },
        { id: 'team-management', title: 'Team Management', description: 'Coordinate agent teams across waves', file: 'steps/03-team-management.md', order: 3 },
        { id: 'review', title: 'Review', description: 'QA verification and code review', file: 'steps/04-review.md', order: 4 },
        { id: 'test', title: 'Test', description: 'Automated testing and build verification', file: 'steps/05-test.md', order: 5 },
        { id: 'update-docs', title: 'Update Docs', description: 'Update documentation to reflect changes', file: 'steps/06-update-docs.md', order: 6 }
      ]
    }
    await fs.promises.writeFile(
      path.join(claudeDir, 'docs', 'workflows', 'default', 'workflow.json'),
      JSON.stringify(workflow, null, 2),
      'utf-8'
    )

    const steps = [
      { file: '01-create-plan.md', content: '# Create Plan\n\nUse `/create-feature-plan` to analyze the codebase and produce a detailed design document.\n' },
      { file: '02-implement-plan.md', content: '# Implement Plan\n\nUse `/implement-feature` to execute the plan through specialist agents in isolated worktrees.\n' },
      { file: '03-team-management.md', content: '# Team Management\n\nThe Team Leader coordinates agent teams across dependency-ordered waves.\n' },
      { file: '04-review.md', content: '# Review\n\nEach task goes through QA review before merge. Up to 3 rounds of feedback.\n' },
      { file: '05-test.md', content: '# Test\n\nWave fence checks verify builds pass. Final Guardian check validates structural integrity.\n' },
      { file: '06-update-docs.md', content: '# Update Docs\n\nUpdate ARCHITECTURE.md, CLAUDE.md, and any affected documentation.\n' }
    ]

    for (const step of steps) {
      await fs.promises.writeFile(
        path.join(workflowsDir, step.file),
        step.content,
        'utf-8'
      )
    }

    await fs.promises.writeFile(path.join(progressDir, '.gitkeep'), '', 'utf-8')

    return { success: true }
  }

  cleanup() {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
  }
}

// --- Workflow IPC Handlers ---
const workflowScanner = new WorkflowScanner()

ipcMain.handle('workflow:has-workflow', async (event, { projectPath }) => {
  return workflowScanner.hasWorkflow(projectPath)
})

ipcMain.handle('workflow:get-config', async (event, { projectPath }) => {
  return workflowScanner.getConfig(projectPath)
})

ipcMain.handle('workflow:get-workflow', async (event, { projectPath }) => {
  return workflowScanner.getWorkflow(projectPath)
})

ipcMain.handle('workflow:get-step-content', async (event, { projectPath, stepFile }) => {
  return workflowScanner.getStepContent(projectPath, stepFile)
})

ipcMain.handle('workflow:save-step-content', async (event, { projectPath, stepFile, content }) => {
  return workflowScanner.saveStepContent(projectPath, stepFile, content)
})

ipcMain.handle('workflow:get-progress', async (event, { projectPath }) => {
  return workflowScanner.getProgress(projectPath)
})

ipcMain.handle('workflow:watch-progress', (event, { projectPath }) => {
  const watchId = workflowScanner.watchProgress(projectPath, (change) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('workflow:progress-changed', change)
    }
  })
  return { watchId }
})

ipcMain.handle('workflow:unwatch-progress', (event, { watchId }) => {
  workflowScanner.unwatchProgress(watchId)
  return { success: true }
})

ipcMain.handle('workflow:scaffold', async (event, { projectPath }) => {
  return workflowScanner.scaffold(projectPath)
})

app.whenReady().then(createWindow)

app.on('window-all-closed', async () => {
  ptyManager.killAll()
  workflowScanner.cleanup()
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
