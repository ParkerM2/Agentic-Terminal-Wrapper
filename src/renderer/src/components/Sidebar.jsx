import React, { useState } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import FileExplorer from './FileExplorer'
import CommandList from './CommandList'
import Settings from './Settings'

const SECTIONS = [
  { id: 'explorer', icon: '\u{1F4C1}', label: 'Explorer' },
  { id: 'commands', icon: '\u26A1', label: 'Commands' },
  { id: 'settings', icon: '\u2699', label: 'Settings' }
]

export default function Sidebar({ cwd, onSendCommand, onOpenFile, settings, onSettingsChange }) {
  const [activeSection, setActiveSection] = useState('explorer')

  return (
    <div className="flex flex-col w-56 bg-card/50 border-r border-border shrink-0" data-slot="sidebar">
      <div className="flex items-center gap-1 px-2 h-8 border-b border-border shrink-0" data-slot="sidebar-nav">
        {SECTIONS.map(section => (
          <Button
            key={section.id}
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", activeSection === section.id && "bg-accent text-accent-foreground")}
            onClick={() => setActiveSection(section.id)}
            title={section.label}
          >
            {section.icon}
          </Button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2" data-slot="sidebar-content">
        {activeSection === 'explorer' && (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">File Explorer</div>
            <FileExplorer cwd={cwd} onOpenFile={onOpenFile} />
          </>
        )}
        {activeSection === 'commands' && (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Claude Commands</div>
            <CommandList onSendCommand={onSendCommand} />
          </>
        )}
        {activeSection === 'settings' && (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Settings</div>
            <Settings settings={settings} onChange={onSettingsChange} />
          </>
        )}
      </div>
    </div>
  )
}
