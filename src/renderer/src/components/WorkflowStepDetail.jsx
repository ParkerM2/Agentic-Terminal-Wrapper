import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'

export default function WorkflowStepDetail({ step, getStepContent, saveStepContent, onBack }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Load step content
  useEffect(() => {
    if (!step?.file) return
    setLoading(true)
    getStepContent(step.file).then(({ content: md, error }) => {
      if (md !== null) {
        setContent(md)
        setEditContent(md)
      } else if (error) {
        setContent(`*Error loading content: ${error}*`)
      }
      setLoading(false)
    })
  }, [step?.file, getStepContent])

  const handleEdit = useCallback(() => {
    setEditing(true)
    setEditContent(content)
    setSaveError(null)
  }, [content])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setEditContent(content)
    setSaveError(null)
  }, [content])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    const { error } = await saveStepContent(step.file, editContent)
    if (error) {
      setSaveError(error)
    } else {
      setContent(editContent)
      setEditing(false)
    }
    setSaving(false)
  }, [step?.file, editContent, saveStepContent])

  if (!step) return null

  return (
    <div className="flex flex-col h-full" data-slot="workflow-step-detail">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={onBack}>
          &#x2190; Back
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-medium">{step.title}</span>
        <Badge variant="outline" className="text-xs">{step.status || 'pending'}</Badge>
        <div className="flex-1" />
        {!editing ? (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleEdit}>
            Edit
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading step content...
          </div>
        ) : editing ? (
          <div className="flex flex-col h-full">
            {saveError && (
              <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/20">
                Save failed: {saveError}
              </div>
            )}
            <textarea
              className="flex-1 w-full resize-none bg-transparent p-4 text-sm font-mono text-foreground focus:outline-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="p-4 space-y-1" data-slot="workflow-step-content">
            {renderMarkdownLines(content)}
          </div>
        )}
      </div>
    </div>
  )
}

// Simple markdown renderer — handles headings, lists, paragraphs, bold
function renderMarkdownLines(text) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-semibold mt-3 mb-1.5">{line.slice(3)}</h2>
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-base font-medium mt-2 mb-1">{line.slice(4)}</h3>
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-2 pl-2">
          <span className="text-muted-foreground shrink-0">&#x2022;</span>
          <span className="text-sm">{line.slice(2)}</span>
        </div>
      )
    }
    if (line.startsWith('```')) {
      return null
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }
    // Handle bold text
    const boldPattern = /\*\*(.*?)\*\*/g
    if (boldPattern.test(line)) {
      const parts = []
      let lastIndex = 0
      // Reset regex after test
      const regex = /\*\*(.*?)\*\*/g
      let match
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index))
        }
        parts.push(<strong key={match.index}>{match[1]}</strong>)
        lastIndex = regex.lastIndex
      }
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex))
      }
      return <p key={i} className="text-sm">{parts}</p>
    }
    return <p key={i} className="text-sm">{line}</p>
  })
}
