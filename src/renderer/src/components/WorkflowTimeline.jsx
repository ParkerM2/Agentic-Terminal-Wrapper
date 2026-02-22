import React from 'react'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import {
  Timeline,
  TimelineItem,
  TimelineItemTitle,
  TimelineItemDescription,
  TimelineItemDate
} from './ui/timeline'

// Map workflow step status to timeline dot variant
function getStepVariant(status) {
  switch (status) {
    case 'completed': return { variant: 'secondary', hollow: false }
    case 'active':    return { variant: 'default', hollow: false }
    case 'failed':    return { variant: 'destructive', hollow: false }
    case 'pending':
    default:          return { variant: 'outline', hollow: true }
  }
}

function getStatusBadgeVariant(status) {
  switch (status) {
    case 'completed': return 'success'
    case 'active':    return 'info'
    case 'failed':    return 'destructive'
    case 'pending':
    default:          return 'outline'
  }
}

export default function WorkflowTimeline({ steps, onStepClick, progress }) {
  return (
    <Timeline
      orientation="vertical"
      alignment="left"
      vertItemSpacing={16}
      vertItemMaxWidth={600}
      noCards={false}
    >
      {steps.map((step) => {
        const { variant, hollow } = getStepVariant(step.status)
        return (
          <TimelineItem
            key={step.id}
            variant={variant}
            hollow={hollow}
            className={cn(
              "cursor-pointer hover:bg-accent/50 transition-colors",
              step.status === 'active' && "ring-1 ring-primary/30"
            )}
            onClick={() => onStepClick?.(step.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <TimelineItemTitle>{step.title}</TimelineItemTitle>
              <Badge variant={getStatusBadgeVariant(step.status)} className="text-[10px] shrink-0">
                {step.status || 'pending'}
              </Badge>
            </div>
            <TimelineItemDescription>{step.description}</TimelineItemDescription>
            {step.order && (
              <TimelineItemDate>Step {step.order} of {steps.length}</TimelineItemDate>
            )}
          </TimelineItem>
        )
      })}
    </Timeline>
  )
}
