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

  // Workflow
  workflowHasWorkflow: (projectPath) => ipcRenderer.invoke('workflow:has-workflow', { projectPath }),
  workflowGetConfig: (projectPath) => ipcRenderer.invoke('workflow:get-config', { projectPath }),
  workflowGetWorkflow: (projectPath) => ipcRenderer.invoke('workflow:get-workflow', { projectPath }),
  workflowGetStepContent: (projectPath, stepFile) => ipcRenderer.invoke('workflow:get-step-content', { projectPath, stepFile }),
  workflowSaveStepContent: (projectPath, stepFile, content) => ipcRenderer.invoke('workflow:save-step-content', { projectPath, stepFile, content }),
  workflowGetProgress: (projectPath) => ipcRenderer.invoke('workflow:get-progress', { projectPath }),
  workflowWatchProgress: (projectPath) => ipcRenderer.invoke('workflow:watch-progress', { projectPath }),
  workflowUnwatchProgress: (watchId) => ipcRenderer.invoke('workflow:unwatch-progress', { watchId }),
  workflowScaffold: (projectPath) => ipcRenderer.invoke('workflow:scaffold', { projectPath }),
  onWorkflowProgressChanged: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('workflow:progress-changed', handler)
    return () => ipcRenderer.removeListener('workflow:progress-changed', handler)
  },

  // Window Controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close')
})
