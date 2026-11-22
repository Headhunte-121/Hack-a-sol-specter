import { Component, type ReactNode } from 'react'
import { translate, getLanguage } from './i18n'

// renderErrorFallback: a module crash shows a friendly screen with Home and Retry. Logs nothing personal.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    /* intentionally empty: nothing personal is logged */
  }
  render() {
    if (!this.state.failed) return this.props.children
    const lang = getLanguage()
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="card space-y-4">
          <h1 className="text-xl font-bold">{translate(lang, 'error.title')}</h1>
          <p>{translate(lang, 'error.body')}</p>
          <button className="btn btn-primary w-full" onClick={() => this.setState({ failed: false })}>
            {translate(lang, 'common.retry')}
          </button>
          <a className="btn btn-secondary w-full" href="#/" onClick={() => this.setState({ failed: false })}>
            {translate(lang, 'common.home')}
          </a>
        </div>
      </div>
    )
  }
}
