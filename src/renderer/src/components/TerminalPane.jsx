import React, { useRef, useEffect } from 'react'
import { useTerminal } from '../hooks/useTerminal'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

export default function TerminalPane({ pane, onClose, cwd, canClose, onActivate, fontSize }) {
  const containerRef = useRef(null)
  const isClaudeSession = pane.autoStart || pane.label === 'Claude'
  const { fit, focus } = useTerminal(pane.ptyId, containerRef, {
    cwd,
    autoStart: isClaudeSession,
    fontSize
  })

  useEffect(() => {
    const timer = setTimeout(() => focus(), 200)
    return () => clearTimeout(timer)
  }, [focus])

  const handleClick = () => {
    focus()
    onActivate?.()
  }

  return (
    <div data-slot="terminal-pane" className="flex flex-col h-full bg-background" onClick={handleClick}>
      <div className="flex items-center justify-between px-3 h-7 bg-card/30 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant={isClaudeSession ? 'info' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {isClaudeSession ? 'Claude' : 'Terminal'}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground truncate">{pane.ptyId.slice(0, 8)}</span>
        </div>
        {canClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onClose(pane.id) }}
            title="Close pane"
          >
            &#x2715;
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-hidden" ref={containerRef} />
    </div>
  )
}
