const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // PTY
  ptyCreate: (opts) => ipcRenderer.invoke('pty:create', opts),
  ptyWrite: (opts) => ipcRenderer.send('pty:write', opts),
  ptyResize: (opts) => ipcRenderer.send('pty:resize', opts),
  ptyKill: (opts) => ipcRenderer.invoke('pty:kill', opts),
  onPtyData: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('pty:data', handler)
    return () => ipcRenderer.removeListener('pty:data', handler)
  },
  onPtyExit: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('pty:exit', handler)
    return () => ipcRenderer.removeListener('pty:exit', handler)
  },

  // File System
  setRoot: (rootPath) => ipcRenderer.invoke('fs:set-root', { rootPath }),
  listDir: (dirPath) => ipcRenderer.invoke('fs:list-dir', { dirPath }),
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', { filePath }),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', { filePath, content }),
  watchDir: (id, dirPath) => ipcRenderer.invoke('fs:watch', { id, dirPath }),
  unwatchDir: (id) => ipcRenderer.invoke('fs:unwatch', { id }),
  onFsChanged: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('fs:changed', handler)
    return () => ipcRenderer.removeListener('fs:changed', handler)
  },

  // Settings Persistence
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', { settings }),

  // System Info
  getHomePath: () => ipcRenderer.invoke('app:get-home-path'),

  // Clipboard
  readClipboardImage: () => ipcRenderer.invoke('clipboard:read-image'),
  saveTempImage: (dataURL) => ipcRenderer.invoke('app:save-temp-image', { dataURL }),

  // Git
  gitIsRepo: (cwd) => ipcRenderer.invoke('git:is-repo', { cwd }),
  gitStatus: (cwd) => ipcRenderer.invoke('git:status', { cwd }),
  gitDiff: (cwd, filePath, staged) => ipcRenderer.invoke('git:diff', { cwd, filePath, staged }),
  gitDiffFile: (cwd, filePath) => ipcRenderer.invoke('git:diff-file', { cwd, filePath }),
  gitStage: (cwd, filePath) => ipcRenderer.invoke('git:stage', { cwd, filePath }),
  gitUnstage: (cwd, filePath) => ipcRenderer.invoke('git:unstage', { cwd, filePath }),

  // Claude Events
  onClaudeSessionChange: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('claude:session-change', handler)
    return () => ipcRenderer.removeListener('claude:session-change', handler)
  },
  onClaudeCostUpdate: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('claude:cost-update', handler)
    return () => ipcRenderer.removeListener('claude:cost-update', handler)
  },
  onClaudeModelUpdate: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('claude:model-update', handler)
    return () => ipcRenderer.removeListener('claude:model-update', handler)
  },

  // Window Controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close')
})
