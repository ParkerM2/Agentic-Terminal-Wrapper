import React, { useEffect, useRef, useState } from 'react'
import { MergeView } from '@codemirror/merge'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { tokyoNightStorm } from '@uiw/codemirror-theme-tokyo-night-storm'
import { getLanguageExtension } from '../utils/languages'

export default function DiffView({ filePath, cwd }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!containerRef.current || !filePath || !cwd) return

    let destroyed = false

    async function loadDiff() {
      setLoading(true)
      setError(null)
      try {
        // Get the relative path for git commands
        const relativePath = filePath.replace(/\\/g, '/')
        const cwdNorm = cwd.replace(/\\/g, '/')
        const relPath = relativePath.startsWith(cwdNorm)
          ? relativePath.slice(cwdNorm.length + 1)
          : relativePath

        const [originalResult, currentResult] = await Promise.all([
          window.electronAPI.gitDiffFile(cwd, relPath),
          window.electronAPI.readFile(filePath)
        ])

        if (destroyed) return

        const original = originalResult.content || ''
        const modified = currentResult.content || ''

        // Clean up previous view
        if (viewRef.current) {
          viewRef.current.destroy()
          viewRef.current = null
        }

        const langExt = getLanguageExtension(filePath)
        const extensions = [
          tokyoNightStorm,
          EditorView.editable.of(false),
          ...(Array.isArray(langExt) ? langExt : [langExt])
        ]

        const view = new MergeView({
          a: {
            doc: original,
            extensions
          },
          b: {
            doc: modified,
            extensions
          },
          parent: containerRef.current,
          collapseUnchanged: { margin: 3, minSize: 4 },
          gutter: true
        })

        viewRef.current = view
      } catch (err) {
        if (!destroyed) setError(err.message)
      }
      if (!destroyed) setLoading(false)
    }

    loadDiff()

    return () => {
      destroyed = true
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [filePath, cwd])

  if (loading) {
    return <div className="diff-view__loading">Loading diff...</div>
  }

  if (error) {
    return <div className="diff-view__error">Error: {error}</div>
  }

  return (
    <div className="diff-view" ref={containerRef} />
  )
}
