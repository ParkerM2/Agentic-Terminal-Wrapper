import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getIconClass } from 'atom-file-icons'

function FileNode({ entry, depth, onSelect, refreshKey }) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState(null)

  const loadChildren = useCallback(async () => {
    const items = await window.electronAPI.listDir(entry.path)
    setChildren(items)
  }, [entry.path])

  // Re-fetch children when refreshKey changes (file system changed)
  useEffect(() => {
    if (expanded && children !== null) {
      loadChildren()
    }
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback(async () => {
    if (entry.type === 'directory') {
      if (!expanded) {
        await loadChildren()
      }
      setExpanded(!expanded)
    } else {
      onSelect(entry)
    }
  }, [entry, expanded, loadChildren, onSelect])

  const iconClass = entry.type === 'directory'
    ? getIconClass(entry.name, { colorMode: 'dark', isDir: true })
    : getIconClass(entry.name, { colorMode: 'dark' })

  return (
    <>
      <div
        className="file-tree-node"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
      >
        <span className={`file-tree-node__icon ${iconClass || ''}`} />
        <span className="file-tree-node__name">{entry.name}</span>
      </div>
      {expanded && children && children.map(child => (
        <FileNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          onSelect={onSelect}
          refreshKey={refreshKey}
        />
      ))}
    </>
  )
}

export default function FileExplorer({ cwd, onOpenFile }) {
  const [rootEntries, setRootEntries] = useState([])
  const [rootPath, setRootPath] = useState('')
  const [pathInput, setPathInput] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [homePath, setHomePath] = useState(null)
  const watchIdRef = useRef('file-explorer-watcher')
  const debounceRef = useRef(null)

  const loadDir = useCallback(async (dirPath) => {
    if (!dirPath) return
    const items = await window.electronAPI.listDir(dirPath)
    setRootEntries(items)
    setRootPath(dirPath)
  }, [])

  // Load home path on mount
  useEffect(() => {
    window.electronAPI.getHomePath().then((hp) => setHomePath(hp))
  }, [])

  // Initial load + set up watcher once homePath is resolved
  useEffect(() => {
    if (homePath === null) return

    const defaultPath = cwd || homePath
    setPathInput(defaultPath)
    window.electronAPI.setRoot(defaultPath)
    loadDir(defaultPath)

    // Start watching
    const watchId = watchIdRef.current
    window.electronAPI.watchDir(watchId, defaultPath)

    // Listen for changes
    const unsub = window.electronAPI.onFsChanged(({ id }) => {
      if (id !== watchId) return

      // Debounce: batch rapid changes into a single refresh
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        loadDir(defaultPath)
        setRefreshKey(k => k + 1)
      }, 300)
    })

    return () => {
      unsub()
      window.electronAPI.unwatchDir(watchId)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cwd, homePath, loadDir])

  // When path changes via form, update the watcher
  const handlePathSubmit = (e) => {
    e.preventDefault()
    window.electronAPI.setRoot(pathInput)
    loadDir(pathInput)

    // Re-watch the new path
    const watchId = watchIdRef.current
    window.electronAPI.unwatchDir(watchId)
    window.electronAPI.watchDir(watchId, pathInput)
  }

  const handleFileSelect = (entry) => {
    onOpenFile?.(entry)
  }

  return (
    <div className="file-tree">
      <form onSubmit={handlePathSubmit} style={{ padding: '4px 0 8px' }}>
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          className="input-area__field"
          style={{ width: '100%', fontSize: '11px', padding: '4px 8px', minHeight: '28px' }}
          placeholder="Directory path..."
        />
      </form>
      {rootEntries.map(entry => (
        <FileNode
          key={entry.path}
          entry={entry}
          depth={0}
          onSelect={handleFileSelect}
          refreshKey={refreshKey}
        />
      ))}
      {rootEntries.length === 0 && (
        <div style={{ padding: '8px', color: 'var(--fg-dim)', fontSize: '12px' }}>
          No files found. Enter a path above.
        </div>
      )}
    </div>
  )
}
