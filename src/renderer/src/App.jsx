import React, { useState, useCallback, useRef, useEffect } from 'react'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import PaneContainer from './components/PaneContainer'
import InputArea from './components/InputArea'

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
      // Send to the active pane, or the first pane if no pane is active
      const targetPane = activePaneId
        ? activeTab.panes.find(p => p.id === activePaneId) || activeTab.panes[0]
        : activeTab.panes[0]
      window.electronAPI.ptyWrite({ id: targetPane.ptyId, data: text + '\n' })
    }
  }, [activeTab, activePaneId])

  const handleSettingsChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'sidebarPosition') {
      setSidebarPosition(value)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+T: New tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        handleAddTab()
      }
      // Ctrl+W: Close current tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        handleCloseTab(activeTabId)
      }
      // Ctrl+Shift+\: Split horizontal
      if (e.ctrlKey && e.shiftKey && e.key === '|') {
        e.preventDefault()
        handleSplitH()
      }
      // Ctrl+Shift+-: Split vertical
      if (e.ctrlKey && e.shiftKey && e.key === '_') {
        e.preventDefault()
        handleSplitV()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAddTab, handleCloseTab, handleSplitH, handleSplitV, activeTabId])

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
          </div>
          <div className="pane-area">
            <PaneContainer
              panes={activeTab.panes}
              onClosePane={handleClosePane}
              cwd={activeTab.cwd}
              onPaneActivate={setActivePaneId}
            />
          </div>
          <InputArea
            onSend={handleSendToTerminal}
          />
        </div>
      </div>
    </div>
  )
}
