import React from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

export default function TabBar({ tabs, activeTabId, onSelectTab, onAddTab, onCloseTab }) {
  return (
    <div className="flex items-center gap-1 px-2 h-8 bg-card/50 border-b border-border overflow-x-auto shrink-0" data-slot="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={cn(
            "group flex items-center gap-1.5 px-3 h-6 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer border-0 bg-transparent",
            tab.id === activeTabId && "bg-accent text-foreground font-medium"
          )}
          onClick={() => onSelectTab(tab.id)}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tab.color }} />
          <span>{tab.name}</span>
          {tabs.length > 1 && (
            <span
              className="ml-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id) }}
            >
              &#x2715;
            </span>
          )}
        </button>
      ))}
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onAddTab} title="New Tab">
        +
      </Button>
    </div>
  )
}
