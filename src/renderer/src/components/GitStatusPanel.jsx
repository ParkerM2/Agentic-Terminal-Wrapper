import React, { useState, useEffect, useCallback, useRef } from 'react'

const STATUS_LABELS = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: '?'
}

const STATUS_COLORS = {
  modified: 'var(--accent-yellow)',
  added: 'var(--accent-green)',
  deleted: 'var(--accent-red)',
  renamed: 'var(--accent-cyan)',
  untracked: 'var(--fg-dim)'
}

export default function GitStatusPanel({ cwd, onOpenDiff }) {
  const [files, setFiles] = useState([])
  const [isRepo, setIsRepo] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!cwd) return
    setLoading(true)
    try {
      const { isRepo: repo } = await window.electronAPI.gitIsRepo(cwd)
      setIsRepo(repo)
      if (repo) {
        const { files: statusFiles } = await window.electronAPI.gitStatus(cwd)
        setFiles(statusFiles || [])
      } else {
        setFiles([])
      }
    } catch {
      setFiles([])
    }
    setLoading(false)
  }, [cwd])

  // Refresh on mount and when cwd changes
  useEffect(() => {
    refresh()
  }, [refresh])

  // Debounced refresh on fs:changed events
  useEffect(() => {
    const unsub = window.electronAPI.onFsChanged(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(refresh, 2000)
    })
    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [refresh])

  const handleStage = useCallback(async (filePath) => {
    if (!cwd) return
    await window.electronAPI.gitStage(cwd, filePath)
    refresh()
  }, [cwd, refresh])

  const handleUnstage = useCallback(async (filePath) => {
    if (!cwd) return
    await window.electronAPI.gitUnstage(cwd, filePath)
    refresh()
  }, [cwd, refresh])

  const handleFileClick = useCallback((file) => {
    onOpenDiff?.(file)
  }, [onOpenDiff])

  if (!cwd) {
    return <div className="git-panel__empty">No project open</div>
  }

  if (!isRepo) {
    return <div className="git-panel__empty">Not a git repository</div>
  }

  const staged = files.filter(f => f.staged)
  const unstaged = files.filter(f => !f.staged)

  return (
    <div className="git-panel">
      <div className="git-panel__toolbar">
        <span className="git-panel__count">{files.length} changed</span>
        <button className="git-panel__refresh" onClick={refresh} disabled={loading} title="Refresh">
          {loading ? '...' : '\u21BB'}
        </button>
      </div>

      {staged.length > 0 && (
        <>
          <div className="git-panel__group-title">Staged</div>
          {staged.map(file => (
            <div key={`s-${file.path}`} className="git-panel__file" onClick={() => handleFileClick(file)}>
              <span
                className="git-panel__status"
                style={{ color: STATUS_COLORS[file.status] }}
              >
                {STATUS_LABELS[file.status] || '?'}
              </span>
              <span className="git-panel__path">{file.path}</span>
              <button
                className="git-panel__action"
                onClick={(e) => { e.stopPropagation(); handleUnstage(file.path) }}
                title="Unstage"
              >
                &minus;
              </button>
            </div>
          ))}
        </>
      )}

      {unstaged.length > 0 && (
        <>
          <div className="git-panel__group-title">Changes</div>
          {unstaged.map(file => (
            <div key={`u-${file.path}`} className="git-panel__file" onClick={() => handleFileClick(file)}>
              <span
                className="git-panel__status"
                style={{ color: STATUS_COLORS[file.status] }}
              >
                {STATUS_LABELS[file.status] || '?'}
              </span>
              <span className="git-panel__path">{file.path}</span>
              <button
                className="git-panel__action"
                onClick={(e) => { e.stopPropagation(); handleStage(file.path) }}
                title="Stage"
              >
                +
              </button>
            </div>
          ))}
        </>
      )}

      {files.length === 0 && !loading && (
        <div className="git-panel__empty">Working tree clean</div>
      )}
    </div>
  )
}
