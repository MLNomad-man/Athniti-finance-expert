import React, { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-base flex items-center justify-center">
          <div className="bg-surface-high rounded-2xl p-8 max-w-md text-center border border-outline-variant/20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-error-red text-3xl">error</span>
            </div>
            <h1 className="text-2xl font-headline font-bold text-on-surface mb-3">Something went wrong</h1>
            <p className="text-on-surface-variant text-sm">
              {this.state.error?.message.includes('Attempt to get default algod configuration')
                ? 'Please set up your environment variables. Create a .env file based on .env.template with your Algod and Indexer credentials.'
                : this.state.error?.message}
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
