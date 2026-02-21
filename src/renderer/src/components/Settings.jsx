import React from 'react'

export default function Settings({ settings, onChange }) {
  return (
    <div className="settings-panel">
      <div className="settings-group">
        <div className="settings-group__label">Sidebar Position</div>
        <div className="settings-option">
          <span className="settings-option__label">Position</span>
          <select
            className="settings-select"
            value={settings.sidebarPosition}
            onChange={(e) => onChange('sidebarPosition', e.target.value)}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-group__label">Font Size</div>
        <div className="settings-option">
          <span className="settings-option__label">Terminal Font</span>
          <select
            className="settings-select"
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
      <div className="settings-group">
        <div className="settings-group__label">Claude</div>
        <div className="settings-option">
          <span className="settings-option__label">Auto-start Claude</span>
          <button
            className={`settings-toggle ${settings.autoStartClaude ? 'settings-toggle--on' : ''}`}
            onClick={() => onChange('autoStartClaude', !settings.autoStartClaude)}
          />
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-group__label">About</div>
        <div className="settings-option" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <span className="settings-option__label">Claude Terminal v1.0.0</span>
          <span style={{ color: 'var(--fg-dim)', fontSize: '11px' }}>
            Electron wrapper for Claude Code CLI
          </span>
        </div>
      </div>
    </div>
  )
}
