import React from 'react'

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
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h2 className="error-boundary__title">Something went wrong</h2>
            <pre className="error-boundary__message">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button className="error-boundary__btn" onClick={this.handleReset}>
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
