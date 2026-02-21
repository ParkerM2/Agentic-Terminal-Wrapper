import React, { useState, useEffect, useCallback, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { tokyoNightStorm } from '@uiw/codemirror-theme-tokyo-night-storm'
import { EditorView } from '@codemirror/view'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { getLanguageExtension, isMarkdownFile } from '../utils/languages'
import { renderMarkdown } from '../utils/markdownRender'
import DiffView from './DiffView'

function getFileName(filePath) {
  return filePath.split(/[\\/]/).pop()
}

export default function EditorPanel({
  openFiles, activeFileId, onSelectFile, onCloseFile, onUpdateContent,
  cwd, editorSplit, secondaryFileId, onSelectSecondaryFile
}) {
  const [fileContents, setFileContents] = useState({})
  const [loadingFiles, setLoadingFiles] = useState({})
  const [modifiedFiles, setModifiedFiles] = useState(new Set())
  const [previewVisible, setPreviewVisible] = useState(false)
  const debounceTimers = useRef({})
  const loadedFilesRef = useRef(new Set())

  // Load file content when a new file is opened
  useEffect(() => {
    const currentIds = new Set(openFiles.map(f => f.id))

    // Clean up removed files
    for (const id of loadedFilesRef.current) {
      if (!currentIds.has(id)) {
        loadedFilesRef.current.delete(id)
      }
    }

    for (const file of openFiles) {
      if (!loadedFilesRef.current.has(file.id)) {
        loadedFilesRef.current.add(file.id)
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
  }, [openFiles])

  // Watch for external file changes and reload
  useEffect(() => {
    const unsub = window.electronAPI.onFsChanged(({ dirPath, filename }) => {
      if (!filename || !dirPath) return
      const changedPath = (dirPath + '/' + filename).replace(/\\/g, '/').toLowerCase()
      for (const file of openFiles) {
        const normalizedPath = file.path.replace(/\\/g, '/').toLowerCase()
        if (normalizedPath === changedPath && !modifiedFiles.has(file.id)) {
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
  const isDiffMode = activeFile?.mode === 'diff'
  const isMd = activeFile && isMarkdownFile(activeFile.path)

  const secondaryFile = editorSplit ? openFiles.find(f => f.id === secondaryFileId) : null
  const secondaryContent = secondaryFile ? (fileContents[secondaryFile.id] ?? '') : ''

  if (openFiles.length === 0) {
    return (
      <div className="editor-panel">
        <div className="editor-panel__empty">
          Click a file in the explorer to open it
        </div>
      </div>
    )
  }

  const renderEditor = (file, content, isSecondary) => {
    if (!file) return null
    const fileLoading = loadingFiles[file.id]
    if (fileLoading) return <div className="editor-panel__empty">Loading...</div>

    if (file.mode === 'diff') {
      return <DiffView filePath={file.path} cwd={cwd} />
    }

    return (
      <CodeMirror
        key={file.id}
        value={content}
        theme={tokyoNightStorm}
        extensions={[
          getLanguageExtension(file.path),
          EditorView.lineWrapping,
        ]}
        onChange={(value) => handleChange(file.id, file.path, value)}
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
              {file.mode === 'diff' && <span style={{ color: 'var(--accent-yellow)', marginRight: 4 }}>D</span>}
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
        <div style={{ flex: 1 }} />
        {isMd && !isDiffMode && (
          <button
            className={`pane-toolbar__btn ${previewVisible ? 'pane-toolbar__btn--active' : ''}`}
            onClick={() => setPreviewVisible(prev => !prev)}
            title="Toggle Markdown Preview"
            style={{ fontSize: 11, height: 22 }}
          >
            Preview
          </button>
        )}
      </div>
      <div className="editor-panel__body">
        {isLoading ? (
          <div className="editor-panel__empty">Loading...</div>
        ) : editorSplit && secondaryFile ? (
          <Group direction="horizontal" style={{ height: '100%' }}>
            <Panel defaultSize={50} minSize={20}>
              {renderEditor(activeFile, activeContent, false)}
            </Panel>
            <Separator />
            <Panel defaultSize={50} minSize={20}>
              {renderEditor(secondaryFile, secondaryContent, true)}
            </Panel>
          </Group>
        ) : isMd && previewVisible && !isDiffMode ? (
          <Group direction="horizontal" style={{ height: '100%' }}>
            <Panel defaultSize={50} minSize={20}>
              {renderEditor(activeFile, activeContent, false)}
            </Panel>
            <Separator />
            <Panel defaultSize={50} minSize={20}>
              <div
                className="markdown-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activeContent) }}
              />
            </Panel>
          </Group>
        ) : activeFile ? (
          renderEditor(activeFile, activeContent, false)
        ) : null}
      </div>
    </div>
  )
}
