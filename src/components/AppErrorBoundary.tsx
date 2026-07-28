import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
          <div className="w-full max-w-lg rounded-card border border-soft bg-card p-6 text-center">
            <h1 className="font-heading text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="mt-2 text-sm text-secondary">
              The page hit an unexpected error. Refresh the browser and try again.
            </p>
            <p className="mt-4 break-words font-mono text-xs text-muted-foreground">
              {this.state.error.message}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button type="button" onClick={() => window.location.reload()}>
                Refresh page
              </Button>
              <Button type="button" variant="outline" onClick={() => this.setState({ error: null })}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
