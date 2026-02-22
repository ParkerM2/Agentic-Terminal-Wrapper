import { createContext, useContext, Children } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TimelineContext = createContext({
  orientation: 'vertical',
  alternating: false,
  alignment: 'left',
  horizItemSpacing: 120,
  horizItemWidth: 200,
  vertItemSpacing: 32,
  vertItemMaxWidth: 400,
  noCards: false,
})

function useTimeline() {
  return useContext(TimelineContext)
}

// ---------------------------------------------------------------------------
// CVA Variants
// ---------------------------------------------------------------------------

const dotVariants = cva(
  'relative z-10 flex items-center justify-center rounded-full border-2 shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary',
        secondary: 'border-success bg-success',
        destructive: 'border-destructive bg-destructive',
        outline: 'border-muted-foreground bg-transparent',
      },
      size: {
        sm: 'size-3',
        md: 'size-4',
        lg: 'size-5',
      },
      hollow: {
        true: 'bg-transparent',
        false: '',
      },
    },
    defaultVariants: { variant: 'default', size: 'md', hollow: false },
  }
)

// ---------------------------------------------------------------------------
// Timeline (root container)
// ---------------------------------------------------------------------------

function Timeline({
  orientation = 'vertical',
  alternating = false,
  alignment,
  horizItemSpacing = 120,
  horizItemWidth = 200,
  vertItemSpacing = 32,
  vertItemMaxWidth = 400,
  noCards = false,
  className,
  children,
}) {
  const resolvedAlignment =
    alignment ?? (orientation === 'horizontal' ? 'bottom' : 'left')

  const ctx = {
    orientation,
    alternating,
    alignment: resolvedAlignment,
    horizItemSpacing,
    horizItemWidth,
    vertItemSpacing,
    vertItemMaxWidth,
    noCards,
  }

  const childArray = Children.toArray(children)
  const totalItems = childArray.length

  if (orientation === 'horizontal') {
    return (
      <TimelineContext.Provider value={ctx}>
        <div
          data-slot="timeline"
          className={cn('flex items-start overflow-x-auto', className)}
          style={{ gap: horizItemSpacing }}
        >
          {childArray.map((child, index) => {
            if (child && child.props !== undefined) {
              return (
                <HorizontalItemWrapper
                  key={child.key ?? index}
                  index={index}
                  totalItems={totalItems}
                >
                  {child}
                </HorizontalItemWrapper>
              )
            }
            return child
          })}
        </div>
      </TimelineContext.Provider>
    )
  }

  // Vertical
  return (
    <TimelineContext.Provider value={ctx}>
      <div
        data-slot="timeline"
        className={cn('relative flex flex-col', className)}
      >
        {childArray.map((child, index) => {
          if (child && child.props !== undefined) {
            return (
              <VerticalItemWrapper
                key={child.key ?? index}
                index={index}
                totalItems={totalItems}
              >
                {child}
              </VerticalItemWrapper>
            )
          }
          return child
        })}
      </div>
    </TimelineContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Internal layout wrappers
// ---------------------------------------------------------------------------

function VerticalItemWrapper({ children, index, totalItems }) {
  const { alternating, alignment, vertItemSpacing, vertItemMaxWidth, noCards } =
    useTimeline()
  const isLast = index === totalItems - 1

  // Determine card side for alternating mode
  let cardSide = alignment // 'left' or 'right'
  if (alternating) {
    cardSide = index % 2 === 0 ? 'left' : 'right'
  }

  // Clone child to inject layout metadata
  const item = children
  const variant = item.props?.variant ?? 'default'
  const hollow = item.props?.hollow ?? false
  const itemOnClick = item.props?.onClick
  const itemClassName = item.props?.className

  const cardContent = (
    <div
      data-slot="timeline-card"
      className={cn(
        'flex-1',
        !noCards && 'rounded-lg border bg-card p-3 text-card-foreground shadow-sm',
        itemOnClick && 'cursor-pointer',
        itemClassName
      )}
      style={{ maxWidth: vertItemMaxWidth }}
      onClick={itemOnClick}
    >
      {item.props?.children}
    </div>
  )

  const dot = (
    <div
      data-slot="timeline-dot"
      className={dotVariants({ variant, hollow })}
    />
  )

  const connector = !isLast ? (
    <div
      data-slot="timeline-connector"
      className="w-0.5 flex-1 bg-border"
    />
  ) : null

  const dotColumn = (
    <div className="flex flex-col items-center">
      {dot}
      {connector}
    </div>
  )

  if (cardSide === 'right') {
    // Card on right: [dot-col] [card]
    return (
      <div
        data-slot="timeline-item"
        className="relative flex gap-4"
        style={{ paddingBottom: isLast ? 0 : vertItemSpacing }}
      >
        {dotColumn}
        {cardContent}
      </div>
    )
  }

  // Card on left (right-aligned dot): [card] [dot-col]
  return (
    <div
      data-slot="timeline-item"
      className="relative flex flex-row-reverse gap-4"
      style={{ paddingBottom: isLast ? 0 : vertItemSpacing }}
    >
      {dotColumn}
      <div className="flex flex-1 justify-end">
        {cardContent}
      </div>
    </div>
  )
}

function HorizontalItemWrapper({ children, index, totalItems }) {
  const { horizItemWidth, alignment, noCards } = useTimeline()
  const isLast = index === totalItems - 1

  const item = children
  const variant = item.props?.variant ?? 'default'
  const hollow = item.props?.hollow ?? false
  const itemOnClick = item.props?.onClick
  const itemClassName = item.props?.className

  const cardContent = (
    <div
      data-slot="timeline-card"
      className={cn(
        !noCards && 'rounded-lg border bg-card p-3 text-card-foreground shadow-sm',
        itemOnClick && 'cursor-pointer',
        itemClassName
      )}
      style={{ width: horizItemWidth }}
      onClick={itemOnClick}
    >
      {item.props?.children}
    </div>
  )

  const dot = (
    <div
      data-slot="timeline-dot"
      className={dotVariants({ variant, hollow })}
    />
  )

  const connector = !isLast ? (
    <div
      data-slot="timeline-connector"
      className="h-0.5 flex-1 bg-border"
    />
  ) : null

  const dotRow = (
    <div className="flex items-center">
      {dot}
      {connector}
    </div>
  )

  // Alignment: 'top' puts card below dots, 'bottom' puts card above dots
  if (alignment === 'top') {
    return (
      <div
        data-slot="timeline-item"
        className="flex flex-col items-center"
        style={{ width: isLast ? horizItemWidth : undefined, minWidth: horizItemWidth }}
      >
        {dotRow}
        <div className="mt-3">{cardContent}</div>
      </div>
    )
  }

  // Default: card above, dot below
  return (
    <div
      data-slot="timeline-item"
      className="flex flex-col items-center"
      style={{ width: isLast ? horizItemWidth : undefined, minWidth: horizItemWidth }}
    >
      <div className="mb-3">{cardContent}</div>
      {dotRow}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TimelineItem (user-facing wrapper)
// ---------------------------------------------------------------------------

function TimelineItem({
  variant = 'default',
  hollow = false,
  className,
  children,
  onClick,
}) {
  // This component acts as a data carrier — layout is handled by the wrappers.
  // When rendered outside the wrapper context (standalone), render a simple div.
  return (
    <div data-slot="timeline-item-content" className={className} onClick={onClick}>
      {children}
    </div>
  )
}

// Attach variant/hollow as static props for wrapper introspection
TimelineItem.displayName = 'TimelineItem'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimelineItemTitle({ className, children }) {
  return (
    <h4
      data-slot="timeline-item-title"
      className={cn('font-semibold text-sm leading-none tracking-tight', className)}
    >
      {children}
    </h4>
  )
}

function TimelineItemDescription({ className, children }) {
  return (
    <p
      data-slot="timeline-item-description"
      className={cn('text-sm text-muted-foreground mt-1', className)}
    >
      {children}
    </p>
  )
}

function TimelineItemDate({ className, children }) {
  return (
    <time
      data-slot="timeline-item-date"
      className={cn('text-xs text-muted-foreground mt-2 block', className)}
    >
      {children}
    </time>
  )
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Timeline,
  TimelineItem,
  TimelineItemTitle,
  TimelineItemDescription,
  TimelineItemDate,
}
