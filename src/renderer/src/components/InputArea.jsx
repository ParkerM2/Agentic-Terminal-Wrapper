import React, { useState, useRef, useCallback } from 'react'

export default function InputArea({ onSend }) {
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [imagePath, setImagePath] = useState(null)
  const textareaRef = useRef(null)

  const handleSend = useCallback(async () => {
    let message = text.trim()
    if (!message && !imagePath) return

    if (imagePath) {
      message = message ? `${message} [image: ${imagePath}]` : `[image: ${imagePath}]`
    }

    onSend(message)
    setText('')
    setImagePreview(null)
    setImagePath(null)
  }, [text, imagePath, onSend])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handlePaste = useCallback(async (e) => {
    // Check clipboard for image
    const dataURL = await window.electronAPI.readClipboardImage()
    if (dataURL) {
      e.preventDefault()
      setImagePreview(dataURL)
      const { filePath } = await window.electronAPI.saveTempImage(dataURL)
      setImagePath(filePath)
    }
  }, [])

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null)
    setImagePath(null)
  }, [])

  const handleInput = useCallback((e) => {
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    setText(textarea.value)
  }, [])

  return (
    <div>
      {imagePreview && (
        <div className="input-area__preview" style={{ margin: '8px 12px 0' }}>
          <img src={imagePreview} alt="Pasted" />
          <span style={{ color: 'var(--fg-dim)', fontSize: '11px' }}>Image attached</span>
          <button className="input-area__preview-remove" onClick={handleRemoveImage}>
            &#x2715;
          </button>
        </div>
      )}
      <div className="input-area">
        <textarea
          ref={textareaRef}
          className="input-area__field"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Send a message to Claude... (Ctrl+V to paste images)"
          rows={1}
        />
        <button
          className="input-area__send"
          onClick={handleSend}
          disabled={!text.trim() && !imagePath}
          title="Send (Enter)"
        >
          &#x2191;
        </button>
      </div>
    </div>
  )
}
