import React, { useState, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

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
    <div data-slot="input-area-wrapper">
      {imagePreview && (
        <div className="flex items-center gap-2 mx-3 mt-2 p-2 rounded-md bg-card border border-border">
          <img src={imagePreview} alt="Pasted" className="h-10 w-10 rounded object-cover" />
          <span className="text-xs text-muted-foreground">Image attached</span>
          <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={handleRemoveImage}>
            &#x2715;
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2 p-2 border-t border-border">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[36px] max-h-[120px]"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Send a message to Claude... (Ctrl+V to paste images)"
          rows={1}
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSend}
          disabled={!text.trim() && !imagePath}
          title="Send (Enter)"
        >
          &#x2191;
        </Button>
      </div>
    </div>
  )
}
