import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import PaneContainer from './components/PaneContainer'
import InputArea from './components/InputArea'
import EditorPanel from './components/EditorPanel'
import CommandPalette from './components/CommandPalette'
import ErrorBoundary from './components/ErrorBoundary'

const TAB_COLORS = [
  '#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68',
  '#f7768e', '#7dcfff', '#ff9e64', '#73daca'
]

function createTab(name, colorIndex = 0) {
  return {
    id: crypto.randomUUID(),
    name: name || 'Project',
    color: TAB_COLORS[colorIndex % TAB_COLORS.length],
    cwd: null,
    panes: [createPane()]
  }
}

function createPane() {
  return {
    id: crypto.randomUUID(),
    ptyId: `pty-${crypto.randomUUID()}`
  }
}

export default function App() {
  const [tabs, setTabs] = useState([createTab('Claude')])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const [settings, setSettings] = useState({
    sidebarPosition: 'left',
    fontSize: 14,
    autoStartClaude: false
  })
  const [activePaneId, setActivePaneId] = useState(null)
  const settingsLoadedRef = useRef(false)

  // Editor state
  const [openFiles, setOpenFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const [editorVisible, setEditorVisible] = useState(false)
  const [editorSplit, setEditorSplit] = useState(false)
  const [secondaryFileId, setSecondaryFileId] = useState(null)

  // Claude state — per-pane tracking
  const [claudeState, setClaudeState] = useState({})

  // Command palette
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  // --- Claude event listeners ---
  useEffect(() => {
    const unsubSession = window.electronAPI.onClaudeSessionChange(({ ptyId, active }) => {
      setClaudeState(prev => ({
        ...prev,
        [ptyId]: { ...prev[ptyId], active }
      }))
    })
    const unsubModel = window.electronAPI.onClaudeModelUpdate(({ ptyId, model }) => {
      setClaudeState(prev => ({
        ...prev,
        [ptyId]: { ...prev[ptyId], model }
      }))
    })
    const unsubCost = window.electronAPI.onClaudeCostUpdate(({ ptyId, cost }) => {
      setClaudeState(prev => ({
        ...prev,
        [ptyId]: { ...prev[ptyId], cost }
      }))
    })
    return () => {
      unsubSession()
      unsubModel()
      unsubCost()
    }
  }, [])

  const handleAddTab = useCallback(() => {
    setTabs(prev => {
      const tab = createTab(null, prev.length)
      setActiveTabId(tab.id)
      return [...prev, tab]
    })
  }, [])

  const handleCloseTab = useCallback((tabId) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      if (tabId === activeTabId) {
        const newIdx = Math.min(idx, next.length - 1)
        setActiveTabId(next[newIdx].id)
      }
      return next
    })
  }, [activeTabId])

  const handleSplitH = useCallback(() => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return { ...tab, panes: [...tab.panes, createPane()] }
    }))
  }, [activeTabId])

  const handleSplitV = useCallback(() => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return { ...tab, panes: [...tab.panes, createPane()], splitDirection: 'vertical' }
    }))
  }, [activeTabId])

  const handleClosePane = useCallback((paneId) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      if (tab.panes.length <= 1) return tab
      return { ...tab, panes: tab.panes.filter(p => p.id !== paneId) }
    }))
  }, [activeTabId])

  const handleSendToTerminal = useCallback((text) => {
    if (activeTab.panes.length > 0) {
      const targetPane = activePaneId
        ? activeTab.panes.find(p => p.id === activePaneId) || activeTab.panes[0]
        : activeTab.panes[0]
      window.electronAPI.ptyWrite({ id: targetPane.ptyId, data: text + '\n' })
    }
  }, [activeTab, activePaneId])

  // Open a file in the editor
  const handleOpenFile = useCallback((entry) => {
    if (entry.type === 'directory') return

    // Check if already open (same path and mode)
    const existing = openFiles.find(f => f.path === entry.path && f.mode === (entry.mode || undefined))
    if (existing) {
      setActiveFileId(existing.id)
      setEditorVisible(true)
      return
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newFile = { id: fileId, path: entry.path, name: entry.name, mode: entry.mode }
    setOpenFiles(prev => [...prev, newFile])
    setActiveFileId(fileId)
    setEditorVisible(true)
  }, [openFiles])

  // Open a diff for a git file
  const handleOpenDiff = useCallback((gitFile) => {
    if (!activeTab.cwd) return
    const fullPath = activeTab.cwd.replace(/\\/g, '/') + '/' + gitFile.path
    handleOpenFile({
      path: fullPath,
      name: gitFile.path.split('/').pop(),
      type: 'file',
      mode: 'diff'
    })
  }, [activeTab.cwd, handleOpenFile])

  const handleCloseFile = useCallback((fileId) => {
    setOpenFiles(prev => {
      const next = prev.filter(f => f.id !== fileId)
      if (fileId === activeFileId) {
        const idx = prev.findIndex(f => f.id === fileId)
        if (next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1)
          setActiveFileId(next[newIdx].id)
        } else {
          setActiveFileId(null)
          setEditorVisible(false)
        }
      }
      if (fileId === secondaryFileId) {
        setSecondaryFileId(null)
        setEditorSplit(false)
      }
      return next
    })
  }, [activeFileId, secondaryFileId])

  const handleSettingsChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleEditor = useCallback(() => {
    setEditorVisible(prev => !prev)
  }, [])

  // Command palette action handler
  const handlePaletteAction = useCallback((action) => {
    switch (action) {
      case 'splitH': handleSplitH(); break
      case 'splitV': handleSplitV(); break
      case 'toggleEditor': toggleEditor(); break
      case 'addTab': handleAddTab(); break
      case 'openClaudeMd': {
        if (activeTab.cwd) {
          handleOpenFile({
            path: activeTab.cwd.replace(/\\/g, '/') + '/CLAUDE.md',
            name: 'CLAUDE.md',
            type: 'file'
          })
        }
        break
      }
    }
  }, [handleSplitH, handleSplitV, toggleEditor, handleAddTab, activeTab.cwd, handleOpenFile])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        handleAddTab()
      }
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        handleCloseTab(activeTabId)
      }
      if (e.ctrlKey && e.shiftKey && e.key === '|') {
        e.preventDefault()
        handleSplitH()
      }
      if (e.ctrlKey && e.shiftKey && e.key === '_') {
        e.preventDefault()
        handleSplitV()
      }
      // Ctrl+E: Toggle editor panel
      if (e.ctrlKey && e.key === 'e' && !e.shiftKey) {
        e.preventDefault()
        toggleEditor()
      }
      // Ctrl+Shift+P: Command palette
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAddTab, handleCloseTab, handleSplitH, handleSplitV, activeTabId, toggleEditor])

  // Load settings on mount
  useEffect(() => {
    window.electronAPI.loadSettings().then((saved) => {
      if (saved) {
        setSettings(prev => ({ ...prev, ...saved }))
      }
      settingsLoadedRef.current = true
    })
  }, [])

  // Save settings on change (debounced, skip initial load)
  useEffect(() => {
    if (!settingsLoadedRef.current) return
    const timer = setTimeout(() => {
      window.electronAPI.saveSettings(settings)
    }, 500)
    return () => clearTimeout(timer)
  }, [settings])

  const paneContainerProps = {
    panes: activeTab.panes,
    onClosePane: handleClosePane,
    cwd: activeTab.cwd,
    onPaneActivate: setActivePaneId,
    fontSize: settings.fontSize,
    direction: activeTab.splitDirection,
    autoStart: settings.autoStartClaude,
    claudeState
  }

  return (
    <ErrorBoundary>
    <div className="app-layout">
      <div className="title-bar">
        <span className="title-bar__label">CLAUDE TERMINAL</span>
        <div className="title-bar__controls">
          <button className="title-bar__btn" onClick={() => window.electronAPI.windowMinimize()}>&#x2013;</button>
          <button className="title-bar__btn" onClick={() => window.electronAPI.windowMaximize()}>&#x25A1;</button>
          <button className="title-bar__btn title-bar__btn--close" onClick={() => window.electronAPI.windowClose()}>&#x2715;</button>
        </div>
      </div>
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
      />
      <div className={`app-body ${settings.sidebarPosition === 'right' ? 'app-body--sidebar-right' : ''}`}>
        <Sidebar
          cwd={activeTab.cwd}
          onSendCommand={handleSendToTerminal}
          onOpenFile={handleOpenFile}
          onOpenDiff={handleOpenDiff}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
        <div className="pane-container">
          <div className="pane-toolbar">
            <button className="pane-toolbar__btn" onClick={handleSplitH} title="Split Horizontal (Ctrl+Shift+|)">
              <span>&#x2502;</span> Split H
            </button>
            <button className="pane-toolbar__btn" onClick={handleSplitV} title="Split Vertical (Ctrl+Shift+_)">
              <span>&#x2500;</span> Split V
            </button>
            <button
              className="pane-toolbar__btn"
              onClick={() => setCommandPaletteOpen(true)}
              title="Command Palette (Ctrl+Shift+P)"
            >
              &#x2318; Commands
            </button>
            <div style={{ flex: 1 }} />
            <button
              className={`pane-toolbar__btn ${editorVisible ? 'pane-toolbar__btn--active' : ''}`}
              onClick={toggleEditor}
              title="Toggle Editor (Ctrl+E)"
            >
              &#x270E; Editor
            </button>
          </div>
          <div className="pane-area">
            {editorVisible ? (
              <Group direction="vertical" style={{ height: '100%' }}>
                <Panel defaultSize={50} minSize={15}>
                  <EditorPanel
                    openFiles={openFiles}
                    activeFileId={activeFileId}
                    onSelectFile={setActiveFileId}
                    onCloseFile={handleCloseFile}
                    cwd={activeTab.cwd}
                    editorSplit={editorSplit}
                    secondaryFileId={secondaryFileId}
                    onSelectSecondaryFile={setSecondaryFileId}
                  />
                </Panel>
                <Separator />
                <Panel defaultSize={50} minSize={15}>
                  <PaneContainer {...paneContainerProps} />
                </Panel>
              </Group>
            ) : (
              <PaneContainer {...paneContainerProps} />
            )}
          </div>
          <InputArea
            onSend={handleSendToTerminal}
          />
        </div>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSendToTerminal={handleSendToTerminal}
        onAction={handlePaletteAction}
      />
    </div>
    </ErrorBoundary>
  )
}
