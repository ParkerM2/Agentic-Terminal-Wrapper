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

  // Clipboard
  readClipboardImage: () => ipcRenderer.invoke('clipboard:read-image'),
  saveTempImage: (dataURL) => ipcRenderer.invoke('app:save-temp-image', { dataURL }),

  // Window Controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close')
})
