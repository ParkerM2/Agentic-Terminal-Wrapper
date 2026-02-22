import React from 'react'
import { Button } from './ui/button'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-background p-8">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
            <pre className="w-full p-3 rounded-md bg-card border border-border text-xs font-mono text-muted-foreground overflow-auto max-h-48">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <Button variant="outline" onClick={this.handleReset}>Try Again</Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
