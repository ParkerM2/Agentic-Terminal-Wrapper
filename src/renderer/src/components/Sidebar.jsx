import React, { useState } from 'react'
import FileExplorer from './FileExplorer'
import CommandList from './CommandList'
import GitStatusPanel from './GitStatusPanel'
import Settings from './Settings'

const SECTIONS = [
  { id: 'explorer', icon: '\u{1F4C1}', label: 'Explorer' },
  { id: 'git', icon: '\u{1F500}', label: 'Git' },
  { id: 'commands', icon: '\u26A1', label: 'Commands' },
  { id: 'settings', icon: '\u2699', label: 'Settings' }
]

export default function Sidebar({ cwd, onSendCommand, onOpenFile, onOpenDiff, settings, onSettingsChange }) {
  const [activeSection, setActiveSection] = useState('explorer')

  return (
    <div className="sidebar">
      <div className="sidebar__nav">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            className={`sidebar__nav-btn ${activeSection === section.id ? 'sidebar__nav-btn--active' : ''}`}
            onClick={() => setActiveSection(section.id)}
            title={section.label}
          >
            {section.icon}
          </button>
        ))}
      </div>
      <div className="sidebar__content">
        {activeSection === 'explorer' && (
          <>
            <div className="sidebar__section-title">File Explorer</div>
            <FileExplorer cwd={cwd} onOpenFile={onOpenFile} />
          </>
        )}
        {activeSection === 'git' && (
          <>
            <div className="sidebar__section-title">Git Status</div>
            <GitStatusPanel cwd={cwd} onOpenDiff={onOpenDiff} />
          </>
        )}
        {activeSection === 'commands' && (
          <>
            <div className="sidebar__section-title">Claude Commands</div>
            <CommandList onSendCommand={onSendCommand} />
          </>
        )}
        {activeSection === 'settings' && (
          <>
            <div className="sidebar__section-title">Settings</div>
            <Settings settings={settings} onChange={onSettingsChange} />
          </>
        )}
      </div>
    </div>
  )
}
