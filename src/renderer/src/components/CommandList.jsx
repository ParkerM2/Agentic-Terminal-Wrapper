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
    <div data-slot="command-list" className="flex flex-col gap-1">
      {COMMANDS.map(cmd => (
        <button
          key={cmd.name}
          className="flex items-start gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
          onClick={() => onSendCommand(cmd.name)}
        >
          <div>
            <div className="text-xs font-mono font-medium text-foreground">{cmd.name}</div>
            <div className="text-xs text-muted-foreground">{cmd.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
