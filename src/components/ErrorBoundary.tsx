import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { session } from '../lib/api'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// Without this, an unhandled render error (bad session data, a malformed
// field from the API, etc.) blanks the entire page with nothing to click —
// not even a way to log out of the broken session that caused it. This
// component's whole job is to guarantee a recovery path always exists.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('BeyondX crashed:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleLogout = () => {
    session.logoutWorker()
    session.logoutEmployer()
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center text-ink-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={26} aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-medium">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-700">
          BeyondX hit an unexpected error. Try reloading — if that doesn't help, log out and sign back in.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={this.handleReload}
            className="rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-500"
          >
            Reload page
          </button>
          <button
            onClick={this.handleLogout}
            className="rounded-full border border-ink-900/15 px-6 py-3 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-900/5"
          >
            Log out & reload
          </button>
        </div>
      </div>
    )
  }
}
