import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useTerminal } from '../hooks/useTerminal'
import ContextMenu from './ContextMenu'

export default function TerminalPane({ pane, onClose, cwd, canClose, onActivate, fontSize, autoStart, claudeState }) {
  const containerRef = useRef(null)
  const { termRef, writeToPty, fit, focus } = useTerminal(pane.ptyId, containerRef, {
    cwd,
    autoStart,
    fontSize
  })

  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, hasSelection: false })

  useEffect(() => {
    const timer = setTimeout(() => focus(), 200)
    return () => clearTimeout(timer)
  }, [focus])

  const handleClick = () => {
    focus()
    onActivate?.()
  }

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const term = termRef.current
    const hasSelection = term ? term.hasSelection() : false
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, hasSelection })
  }, [termRef])

  const closeMenu = useCallback(() => {
    setCtxMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  const handleCopy = useCallback(() => {
    const sel = termRef.current?.getSelection()
    if (sel) window.electronAPI.clipboardWriteText(sel)
    termRef.current?.clearSelection()
    closeMenu()
  }, [termRef, closeMenu])

  const handlePaste = useCallback(() => {
    window.electronAPI.clipboardReadText().then((text) => {
      if (text) writeToPty(text)
    })
    closeMenu()
  }, [writeToPty, closeMenu])

  const handleSelectAll = useCallback(() => {
    termRef.current?.selectAll()
    closeMenu()
  }, [termRef, closeMenu])

  const handleClear = useCallback(() => {
    termRef.current?.clear()
    closeMenu()
  }, [termRef, closeMenu])

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
      <div className="terminal-pane__body" ref={containerRef} onContextMenu={handleContextMenu} />
      <ContextMenu
        x={ctxMenu.x}
        y={ctxMenu.y}
        visible={ctxMenu.visible}
        hasSelection={ctxMenu.hasSelection}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onSelectAll={handleSelectAll}
        onClear={handleClear}
        onClose={closeMenu}
      />
    </div>
  )
}
