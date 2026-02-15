import React, { useRef, useEffect } from 'react'
import { useTerminal } from '../hooks/useTerminal'

export default function TerminalPane({ pane, onClose, cwd, canClose, onActivate }) {
  const containerRef = useRef(null)
  const { fit, focus } = useTerminal(pane.ptyId, containerRef, {
    cwd,
    autoStart: false
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
    <div className="terminal-pane" onClick={handleClick}>
      <div className="terminal-pane__header">
        <span className="terminal-pane__title">{pane.ptyId.slice(0, 16)}</span>
        {canClose && (
          <button
            className="terminal-pane__close"
            onClick={(e) => { e.stopPropagation(); onClose(pane.id) }}
            title="Close pane"
          >
            &#x2715;
          </button>
        )}
      </div>
      <div className="terminal-pane__body" ref={containerRef} />
    </div>
  )
}
