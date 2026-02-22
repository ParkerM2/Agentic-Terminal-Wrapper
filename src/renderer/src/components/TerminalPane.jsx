import React, { useRef, useEffect } from 'react'
import { useTerminal } from '../hooks/useTerminal'
import { Button } from './ui/button'

export default function TerminalPane({ pane, onClose, cwd, canClose, onActivate, fontSize }) {
  const containerRef = useRef(null)
  const { fit, focus } = useTerminal(pane.ptyId, containerRef, {
    cwd,
    autoStart: false,
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
        <span className="text-xs font-mono text-muted-foreground truncate">{pane.ptyId.slice(0, 16)}</span>
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
