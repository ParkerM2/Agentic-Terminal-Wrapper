import React, { useState, useCallback, useEffect, useRef } from 'react'

const COMMANDS = [
  // Claude slash commands
  { id: 'slash-help', name: '/help', desc: 'Show help information', type: 'slash' },
  { id: 'slash-clear', name: '/clear', desc: 'Clear conversation history', type: 'slash' },
  { id: 'slash-compact', name: '/compact', desc: 'Compact conversation context', type: 'slash' },
  { id: 'slash-config', name: '/config', desc: 'View/modify configuration', type: 'slash' },
  { id: 'slash-cost', name: '/cost', desc: 'Show token usage and cost', type: 'slash' },
  { id: 'slash-doctor', name: '/doctor', desc: 'Check Claude Code health', type: 'slash' },
  { id: 'slash-init', name: '/init', desc: 'Initialize project with CLAUDE.md', type: 'slash' },
  { id: 'slash-login', name: '/login', desc: 'Switch Anthropic accounts', type: 'slash' },
  { id: 'slash-logout', name: '/logout', desc: 'Sign out from Anthropic', type: 'slash' },
  { id: 'slash-memory', name: '/memory', desc: 'Edit CLAUDE.md memory files', type: 'slash' },
  { id: 'slash-model', name: '/model', desc: 'Switch Claude model', type: 'slash' },
  { id: 'slash-permissions', name: '/permissions', desc: 'View/update permissions', type: 'slash' },
  { id: 'slash-review', name: '/review', desc: 'Request code review', type: 'slash' },
  { id: 'slash-status', name: '/status', desc: 'View account and session status', type: 'slash' },
  // Model switching
  { id: 'model-opus', name: '/model claude-opus-4-6', desc: 'Switch to Opus 4.6', type: 'model' },
  { id: 'model-sonnet', name: '/model claude-sonnet-4-6', desc: 'Switch to Sonnet 4.6', type: 'model' },
  { id: 'model-haiku', name: '/model claude-haiku-4-5-20251001', desc: 'Switch to Haiku 4.5', type: 'model' },
  // App actions
  { id: 'app-split-h', name: 'Split Horizontal', desc: 'Add a horizontal pane split', type: 'action', action: 'splitH' },
  { id: 'app-split-v', name: 'Split Vertical', desc: 'Add a vertical pane split', type: 'action', action: 'splitV' },
  { id: 'app-toggle-editor', name: 'Toggle Editor', desc: 'Show/hide the editor panel', type: 'action', action: 'toggleEditor' },
  { id: 'app-new-tab', name: 'New Tab', desc: 'Open a new project tab', type: 'action', action: 'addTab' },
  { id: 'app-claude-md', name: 'Open CLAUDE.md', desc: 'Open CLAUDE.md in editor', type: 'action', action: 'openClaudeMd' },
]

function fuzzyMatch(query, text) {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

export default function CommandPalette({ open, onClose, onSendToTerminal, onAction }) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)

  const filtered = query
    ? COMMANDS.filter(cmd => fuzzyMatch(query, cmd.name) || fuzzyMatch(query, cmd.desc))
    : COMMANDS

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const execute = useCallback((cmd) => {
    if (cmd.type === 'slash' || cmd.type === 'model') {
      onSendToTerminal?.(cmd.name)
    } else if (cmd.type === 'action') {
      onAction?.(cmd.action)
    }
    onClose()
  }, [onSendToTerminal, onAction, onClose])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIdx]) {
        execute(filtered[selectedIdx])
      }
    }
  }, [onClose, filtered, selectedIdx, execute])

  if (!open) return null

  return (
    <div className="command-palette__overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette__input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
        />
        <div className="command-palette__list">
          {filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              className={`command-palette__item ${idx === selectedIdx ? 'command-palette__item--selected' : ''}`}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <span className="command-palette__item-name">{cmd.name}</span>
              <span className="command-palette__item-desc">{cmd.desc}</span>
              <span className={`command-palette__item-badge command-palette__item-badge--${cmd.type}`}>
                {cmd.type}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="command-palette__empty">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  )
}
