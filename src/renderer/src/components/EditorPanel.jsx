import React, { useState, useEffect, useCallback, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { tokyoNightStorm } from '@uiw/codemirror-theme-tokyo-night-storm'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { rust } from '@codemirror/lang-rust'
import { EditorView } from '@codemirror/view'

const LANG_MAP = {
  js: () => javascript({ jsx: true }),
  jsx: () => javascript({ jsx: true }),
  ts: () => javascript({ jsx: true, typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  mjs: () => javascript(),
  cjs: () => javascript(),
  py: () => python(),
  json: () => json(),
  md: () => markdown(),
  markdown: () => markdown(),
  html: () => html(),
  htm: () => html(),
  css: () => css(),
  scss: () => css(),
  c: () => cpp(),
  cpp: () => cpp(),
  h: () => cpp(),
  hpp: () => cpp(),
  java: () => java(),
  rs: () => rust(),
}

function getLanguageExtension(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const factory = LANG_MAP[ext]
  return factory ? factory() : []
}

function getFileName(filePath) {
  return filePath.split(/[\\/]/).pop()
}

export default function EditorPanel({ openFiles, activeFileId, onSelectFile, onCloseFile, onUpdateContent }) {
  const [fileContents, setFileContents] = useState({})
  const [loadingFiles, setLoadingFiles] = useState({})
  const [modifiedFiles, setModifiedFiles] = useState(new Set())
  const debounceTimers = useRef({})

  // Load file content when a new file is opened
  useEffect(() => {
    for (const file of openFiles) {
      if (fileContents[file.id] === undefined && !loadingFiles[file.id]) {
        setLoadingFiles(prev => ({ ...prev, [file.id]: true }))
        window.electronAPI.readFile(file.path).then(({ content, error }) => {
          if (!error && content !== null) {
            setFileContents(prev => ({ ...prev, [file.id]: content }))
          } else {
            setFileContents(prev => ({ ...prev, [file.id]: `// Error loading file: ${error}` }))
          }
          setLoadingFiles(prev => ({ ...prev, [file.id]: false }))
        })
      }
    }
  }, [openFiles]) // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for external file changes and reload
  useEffect(() => {
    const unsub = window.electronAPI.onFsChanged(({ filename }) => {
      if (!filename) return
      for (const file of openFiles) {
        // If the changed file matches an open file (by name ending), reload it
        const normalizedFilename = filename.replace(/\\/g, '/')
        const normalizedPath = file.path.replace(/\\/g, '/')
        if (normalizedPath.endsWith(normalizedFilename) && !modifiedFiles.has(file.id)) {
          window.electronAPI.readFile(file.path).then(({ content, error }) => {
            if (!error && content !== null) {
              setFileContents(prev => ({ ...prev, [file.id]: content }))
            }
          })
        }
      }
    })
    return () => unsub()
  }, [openFiles, modifiedFiles])

  const handleChange = useCallback((fileId, filePath, value) => {
    setFileContents(prev => ({ ...prev, [fileId]: value }))
    setModifiedFiles(prev => new Set(prev).add(fileId))
    onUpdateContent?.(fileId, value)

    // Debounced auto-save
    if (debounceTimers.current[fileId]) clearTimeout(debounceTimers.current[fileId])
    debounceTimers.current[fileId] = setTimeout(() => {
      window.electronAPI.writeFile(filePath, value).then(({ error }) => {
        if (!error) {
          setModifiedFiles(prev => {
            const next = new Set(prev)
            next.delete(fileId)
            return next
          })
        }
      })
    }, 1000)
  }, [onUpdateContent])

  const activeFile = openFiles.find(f => f.id === activeFileId)
  const activeContent = activeFile ? (fileContents[activeFile.id] ?? '') : ''
  const isLoading = activeFile ? loadingFiles[activeFile.id] : false

  if (openFiles.length === 0) {
    return (
      <div className="editor-panel">
        <div className="editor-panel__empty">
          Click a file in the explorer to open it
        </div>
      </div>
    )
  }

  return (
    <div className="editor-panel">
      <div className="editor-tabs">
        {openFiles.map(file => (
          <button
            key={file.id}
            className={`editor-tab ${file.id === activeFileId ? 'editor-tab--active' : ''}`}
            onClick={() => onSelectFile(file.id)}
          >
            <span className="editor-tab__name">
              {modifiedFiles.has(file.id) && <span className="editor-tab__dot" />}
              {getFileName(file.path)}
            </span>
            <span
              className="editor-tab__close"
              onClick={(e) => { e.stopPropagation(); onCloseFile(file.id) }}
            >
              &#x2715;
            </span>
          </button>
        ))}
      </div>
      <div className="editor-panel__body">
        {isLoading ? (
          <div className="editor-panel__empty">Loading...</div>
        ) : activeFile ? (
          <CodeMirror
            key={activeFile.id}
            value={activeContent}
            theme={tokyoNightStorm}
            extensions={[
              getLanguageExtension(activeFile.path),
              EditorView.lineWrapping,
            ]}
            onChange={(value) => handleChange(activeFile.id, activeFile.path, value)}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightActiveLine: true,
              foldGutter: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              indentOnInput: true,
              searchKeymap: true,
            }}
            style={{ height: '100%', overflow: 'auto' }}
          />
        ) : null}
      </div>
    </div>
  )
}
