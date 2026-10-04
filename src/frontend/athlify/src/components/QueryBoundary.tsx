import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { LoadingIndicator, PageErrorState } from './Page'

interface QueryBoundaryProps {
  children: ReactNode
  /** Called when the user retries; the page refetches its query (for example by bumping a fetch key). */
  onRetry: () => void
  /** Replaces the default spinner while the query is loading, for example with a skeleton of the page. */
  fallback?: ReactNode
  errorMessage?: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  onRetry: () => void
  errorMessage?: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  private retry = () => {
    this.setState({ failed: false })
    this.props.onRetry()
  }

  render() {
    if (this.state.failed) {
      return <PageErrorState message={this.props.errorMessage} onRetry={this.retry} />
    }
    return this.props.children
  }
}

/**
 * Maps a data component's three states onto the Page states: loading (Suspense), failed (error
 * boundary with retry) and loaded. The page header stays visible in all of them.
 */
export function QueryBoundary({ children, onRetry, fallback, errorMessage }: QueryBoundaryProps) {
  return (
    <ErrorBoundary onRetry={onRetry} errorMessage={errorMessage}>
      <Suspense fallback={fallback ?? <LoadingIndicator />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
