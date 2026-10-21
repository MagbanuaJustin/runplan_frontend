import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="shell" role="alert">
        <h1>Something went wrong</h1>
        <p>The page hit an unexpected error. Reload to try again.</p>
        <p className="note">{String(this.state.error?.message ?? this.state.error)}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className="btn btn-secondary" href="/dashboard">Go to dashboard</a>
        </div>
      </main>
    )
  }
}