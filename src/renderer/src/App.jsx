import React, { useState, useCallback, useEffect } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import PaneContainer from './components/PaneContainer'
import InputArea from './components/InputArea'
import EditorPanel from './components/EditorPanel'

const TAB_COLORS = [
  '#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68',
  '#f7768e', '#7dcfff', '#ff9e64', '#73daca'
]

let nextTabId = 1
let nextPaneId = 1

function createTab(name, cwd) {
  const id = `tab-${nextTabId++}`
  return {
    id,
    name: name || `Project ${nextTabId - 1}`,
    color: TAB_COLORS[(nextTabId - 2) % TAB_COLORS.length],
    cwd: cwd || null,
    panes: [createPane()]
  }
}

function createPane() {
  return {
    id: `pane-${nextPaneId++}`,
    ptyId: `pty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }
}

export default function App() {
  const [tabs, setTabs] = useState([createTab('Claude')])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const [sidebarPosition, setSidebarPosition] = useState('left')
  const [settings, setSettings] = useState({
    sidebarPosition: 'left',
    fontSize: 14
  })
  const [activePaneId, setActivePaneId] = useState(null)

  // Editor state
  const [openFiles, setOpenFiles] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const [editorVisible, setEditorVisible] = useState(false)

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const handleAddTab = useCallback(() => {
    const tab = createTab()
    setTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
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
    if (key === 'sidebarPosition') {
      setSidebarPosition(value)
    }
  }, [])

  const toggleEditor = useCallback(() => {
    setEditorVisible(prev => !prev)
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAddTab, handleCloseTab, handleSplitH, handleSplitV, activeTabId, toggleEditor])

  return (
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
      <div className={`app-body ${sidebarPosition === 'right' ? 'app-body--sidebar-right' : ''}`}>
        <Sidebar
          cwd={activeTab.cwd}
          onSendCommand={handleSendToTerminal}
          onOpenFile={handleOpenFile}
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
                  />
                </Panel>
                <Separator />
                <Panel defaultSize={50} minSize={15}>
                  <PaneContainer
                    panes={activeTab.panes}
                    onClosePane={handleClosePane}
                    cwd={activeTab.cwd}
                    onPaneActivate={setActivePaneId}
                  />
                </Panel>
              </Group>
            ) : (
              <PaneContainer
                panes={activeTab.panes}
                onClosePane={handleClosePane}
                cwd={activeTab.cwd}
                onPaneActivate={setActivePaneId}
              />
            )}
          </div>
          <InputArea
            onSend={handleSendToTerminal}
          />
        </div>
      </div>
    </div>
  )
}
