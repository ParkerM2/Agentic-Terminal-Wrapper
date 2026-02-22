import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './ui/input'

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

  const icon = entry.type === 'directory'
    ? (expanded ? '\u{1F4C2}' : '\u{1F4C1}')
    : '\u{1F4C4}'

  return (
    <>
      <div
        className="flex items-center gap-1.5 py-0.5 px-1 rounded-sm cursor-pointer hover:bg-accent text-sm transition-colors"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
      >
        <span className="shrink-0 text-xs">{icon}</span>
        <span className="truncate text-sm">{entry.name}</span>
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
    <div data-slot="file-explorer" className="flex flex-col">
      <form onSubmit={handlePathSubmit} className="pb-2">
        <Input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          className="h-7 text-xs"
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
        <p className="px-2 text-muted-foreground text-xs">No files found. Enter a path above.</p>
      )}
    </div>
  )
}
