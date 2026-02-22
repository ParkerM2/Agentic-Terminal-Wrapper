import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { cn } from './lib/utils'
import { Button } from './components/ui/button'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import PaneContainer from './components/PaneContainer'
import InputArea from './components/InputArea'
import EditorPanel from './components/EditorPanel'
import ErrorBoundary from './components/ErrorBoundary'
import { useWorkflow } from './hooks/useWorkflow'
import WorkflowPanel from './components/WorkflowPanel'

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
    fontSize: 14
  })
  const [activePaneId, setActivePaneId] = useState(null)
  const settingsLoadedRef = useRef(false)

  // Editor state
  const [openFiles, setOpenFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const [editorVisible, setEditorVisible] = useState(false)
  const [workflowVisible, setWorkflowVisible] = useState(false)

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  // Workflow state
  const workflowState = useWorkflow(activeTab.cwd)

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

    // Check if already open
    const existing = openFiles.find(f => f.path === entry.path)
    if (existing) {
      setActiveFileId(existing.id)
      setEditorVisible(true)
      return
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newFile = { id: fileId, path: entry.path, name: entry.name }
    setOpenFiles(prev => [...prev, newFile])
    setActiveFileId(fileId)
    setEditorVisible(true)
  }, [openFiles])

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
      return next
    })
  }, [activeFileId])

  const handleSettingsChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleEditor = useCallback(() => {
    setEditorVisible(prev => !prev)
  }, [])

  const toggleWorkflow = useCallback(() => {
    setWorkflowVisible(prev => !prev)
  }, [])

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
      // Ctrl+Shift+W: Toggle workflow panel
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault()
        toggleWorkflow()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAddTab, handleCloseTab, handleSplitH, handleSplitV, activeTabId, toggleEditor, toggleWorkflow])

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

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden" data-slot="app-layout">
      <div className="flex items-center justify-between h-8 px-3 bg-background/80 backdrop-blur-sm border-b border-border electron-drag select-none shrink-0" data-slot="title-bar">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase electron-no-drag">CLAUDE TERMINAL</span>
        <div className="flex items-center gap-1 electron-no-drag">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => window.electronAPI.windowMinimize()}>&#x2013;</Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => window.electronAPI.windowMaximize()}>&#x25A1;</Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:bg-destructive hover:text-destructive-foreground" onClick={() => window.electronAPI.windowClose()}>&#x2715;</Button>
        </div>
      </div>
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
      />
      <div className={cn("flex flex-1 overflow-hidden", settings.sidebarPosition === 'right' && "flex-row-reverse")} data-slot="app-body">
        <Sidebar
          cwd={activeTab.cwd}
          onSendCommand={handleSendToTerminal}
          onOpenFile={handleOpenFile}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
        <div className="flex flex-col flex-1 overflow-hidden" data-slot="pane-container">
          <div className="flex items-center gap-2 px-2 h-8 border-b border-border shrink-0" data-slot="pane-toolbar">
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleSplitH} title="Split Horizontal (Ctrl+Shift+|)">
              <span>&#x2502;</span> Split H
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleSplitV} title="Split Vertical (Ctrl+Shift+_)">
              <span>&#x2500;</span> Split V
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-6 text-xs gap-1", editorVisible && "bg-accent text-accent-foreground")}
              onClick={toggleEditor}
              title="Toggle Editor (Ctrl+E)"
            >
              &#x270E; Editor
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-6 text-xs gap-1", workflowVisible && "bg-accent text-accent-foreground")}
              onClick={toggleWorkflow}
              title="Toggle Workflow Panel (Ctrl+Shift+W)"
            >
              &#x2699; Workflow
            </Button>
          </div>
          <div className="flex-1 overflow-hidden" data-slot="pane-area">
            {workflowVisible ? (
              <Group direction="horizontal" style={{ height: '100%' }}>
                <Panel defaultSize={65} minSize={30}>
                  {editorVisible ? (
                    <Group direction="vertical" style={{ height: '100%' }}>
                      <Panel defaultSize={50} minSize={15}>
                        <EditorPanel
                          openFiles={openFiles}
                          activeFileId={activeFileId}
                          onSelectFile={setActiveFileId}
                          onCloseFile={handleCloseFile}
                        />
                      </Panel>
                      <Separator />
                      <Panel defaultSize={50} minSize={15}>
                        <PaneContainer
                          panes={activeTab.panes}
                          onClosePane={handleClosePane}
                          cwd={activeTab.cwd}
                          onPaneActivate={setActivePaneId}
                          fontSize={settings.fontSize}
                          direction={activeTab.splitDirection}
                        />
                      </Panel>
                    </Group>
                  ) : (
                    <PaneContainer
                      panes={activeTab.panes}
                      onClosePane={handleClosePane}
                      cwd={activeTab.cwd}
                      onPaneActivate={setActivePaneId}
                      fontSize={settings.fontSize}
                      direction={activeTab.splitDirection}
                    />
                  )}
                </Panel>
                <Separator />
                <Panel defaultSize={35} minSize={20}>
                  <WorkflowPanel {...workflowState} />
                </Panel>
              </Group>
            ) : (
              editorVisible ? (
                <Group direction="vertical" style={{ height: '100%' }}>
                  <Panel defaultSize={50} minSize={15}>
                    <EditorPanel
                      openFiles={openFiles}
                      activeFileId={activeFileId}
                      onSelectFile={setActiveFileId}
                      onCloseFile={handleCloseFile}
                    />
                  </Panel>
                  <Separator />
                  <Panel defaultSize={50} minSize={15}>
                    <PaneContainer
                      panes={activeTab.panes}
                      onClosePane={handleClosePane}
                      cwd={activeTab.cwd}
                      onPaneActivate={setActivePaneId}
                      fontSize={settings.fontSize}
                      direction={activeTab.splitDirection}
                    />
                  </Panel>
                </Group>
              ) : (
                <PaneContainer
                  panes={activeTab.panes}
                  onClosePane={handleClosePane}
                  cwd={activeTab.cwd}
                  onPaneActivate={setActivePaneId}
                  fontSize={settings.fontSize}
                  direction={activeTab.splitDirection}
                />
              )
            )}
          </div>
          <InputArea
            onSend={handleSendToTerminal}
          />
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
