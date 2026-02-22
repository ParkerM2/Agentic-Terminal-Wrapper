import React, { useState, useCallback } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

export default function WorkflowPanel({ workflow, steps, progress, hasWorkflow, loading, error, getStepContent, saveStepContent, scaffoldWorkflow, refresh }) {
  const [activeStepId, setActiveStepId] = useState(null)

  const handleStepClick = useCallback((stepId) => {
    setActiveStepId(stepId)
  }, [])

  const handleBack = useCallback(() => {
    setActiveStepId(null)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span className="text-sm">Loading workflow...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
      </div>
    )
  }

  if (!hasWorkflow) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">No Workflow Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            This project doesn't have a workflow configuration yet.
            Set up the workflow system to enable planning, implementation, and review tracking.
          </p>
        </div>
        <Button onClick={scaffoldWorkflow}>
          Setup Workflow
        </Button>
      </div>
    )
  }

  // If a step is selected, render the step detail view
  if (activeStepId) {
    const step = steps.find(s => s.id === activeStepId)
    if (!step) {
      setActiveStepId(null)
      return null
    }

    return (
      <div className="flex flex-col h-full" data-slot="workflow-step-detail">
        <div className="flex items-center gap-2 px-4 h-10 border-b border-border shrink-0">
          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={handleBack}>
            &#x2190; Back
          </Button>
          <span className="text-sm font-medium">{step.title}</span>
          <Badge variant="outline" className="ml-auto text-xs">{step.status || 'pending'}</Badge>
        </div>
        <div className="flex-1 overflow-auto p-4" id={`step-detail-${step.id}`}>
          {/* WorkflowStepDetail content will mount here via Task #15 */}
          <p className="text-sm text-muted-foreground">{step.description}</p>
          <p className="text-xs text-muted-foreground mt-4">Step file: {step.file}</p>
        </div>
      </div>
    )
  }

  // Timeline overview
  return (
    <div className="flex flex-col h-full" data-slot="workflow-panel">
      <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold">Workflow</h3>
        <div className="flex items-center gap-2">
          {progress && progress.features.length > 0 && (
            <Badge variant="info" className="text-xs">
              {progress.features.filter(f => f.status === 'merged' || f.status === 'completed').length}/{progress.features.length} features
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refresh} title="Refresh">
            &#x21BB;
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4" data-slot="workflow-timeline-container">
        {/* WorkflowTimeline from Task #15 will render here */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={cn(
                "w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors",
                "flex items-start gap-3"
              )}
              onClick={() => handleStepClick(step.id)}
            >
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 mt-0.5",
                step.status === 'completed' ? "bg-primary text-primary-foreground" :
                step.status === 'active' ? "bg-info text-info-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
