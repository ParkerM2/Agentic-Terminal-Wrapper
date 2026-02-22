import React from 'react'

export default function Settings({ settings, onChange }) {
  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sidebar Position</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">Position</span>
          <select
            className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={settings.sidebarPosition}
            onChange={(e) => onChange('sidebarPosition', e.target.value)}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Size</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">Terminal Font</span>
          <select
            className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={settings.fontSize}
            onChange={(e) => onChange('fontSize', Number(e.target.value))}
          >
            <option value={12}>12px</option>
            <option value={13}>13px</option>
            <option value={14}>14px</option>
            <option value={15}>15px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About</div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm text-foreground">Claude Terminal v1.0.0</span>
          <span className="text-xs text-muted-foreground">
            Electron wrapper for Claude Code CLI
          </span>
        </div>
      </div>
    </div>
  )
}
