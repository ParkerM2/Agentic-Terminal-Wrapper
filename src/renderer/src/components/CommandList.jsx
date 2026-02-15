import React from 'react'

const COMMANDS = [
  { name: '/help', desc: 'Show help information' },
  { name: '/clear', desc: 'Clear conversation history' },
  { name: '/compact', desc: 'Compact conversation context' },
  { name: '/config', desc: 'View/modify configuration' },
  { name: '/cost', desc: 'Show token usage and cost' },
  { name: '/doctor', desc: 'Check Claude Code health' },
  { name: '/init', desc: 'Initialize project with CLAUDE.md' },
  { name: '/login', desc: 'Switch Anthropic accounts' },
  { name: '/logout', desc: 'Sign out from Anthropic' },
  { name: '/memory', desc: 'Edit CLAUDE.md memory files' },
  { name: '/model', desc: 'Switch Claude model' },
  { name: '/permissions', desc: 'View/update permissions' },
  { name: '/review', desc: 'Request code review' },
  { name: '/status', desc: 'View account and session status' }
]

export default function CommandList({ onSendCommand }) {
  return (
    <div className="command-list">
      {COMMANDS.map(cmd => (
        <button
          key={cmd.name}
          className="command-item"
          onClick={() => onSendCommand(cmd.name)}
        >
          <div>
            <div className="command-item__name">{cmd.name}</div>
            <div className="command-item__desc">{cmd.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
