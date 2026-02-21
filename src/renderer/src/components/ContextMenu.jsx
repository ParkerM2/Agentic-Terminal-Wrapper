import React, { useEffect, useRef } from 'react'

export default function ContextMenu({ x, y, visible, hasSelection, onCopy, onPaste, onSelectAll, onClear, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    if (!visible) return

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const handleBlur = () => onClose()

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('blur', handleBlur)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="context-menu" ref={menuRef} style={{ left: x, top: y }}>
      {hasSelection && (
        <button className="context-menu__item" onClick={onCopy}>
          Copy
        </button>
      )}
      <button className="context-menu__item" onClick={onPaste}>
        Paste
      </button>
      <button className="context-menu__item" onClick={onSelectAll}>
        Select All
      </button>
      <div className="context-menu__separator" />
      <button className="context-menu__item" onClick={onClear}>
        Clear Terminal
      </button>
    </div>
  )
}
