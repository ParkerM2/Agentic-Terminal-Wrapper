import React, { useRef, useEffect } from 'react'
import { useTerminal } from '../hooks/useTerminal'

export default function TerminalPane({ pane, onClose, cwd, canClose, onActivate, fontSize, autoStart, claudeState }) {
  const containerRef = useRef(null)
  const { fit, focus } = useTerminal(pane.ptyId, containerRef, {
    cwd,
    autoStart,
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

  const cs = claudeState?.[pane.ptyId]

  return (
    <div className="terminal-pane" onClick={handleClick}>
      <div className="terminal-pane__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {cs?.active && <span className="terminal-pane__indicator" />}
          <span className="terminal-pane__title">{pane.ptyId.slice(0, 16)}</span>
          {cs?.model && <span className="terminal-pane__model">{cs.model}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {cs?.cost && <span className="terminal-pane__cost">{cs.cost}</span>}
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
      </div>
      <div className="terminal-pane__body" ref={containerRef} />
    </div>
  )
}
