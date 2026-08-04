import { createContext, useContext, useState, type ReactNode } from 'react'
import { session, referral } from '../../lib/api'

export type AuthView =
  | 'worker-login'
  | 'employer-login'
  | 'worker-register'
  | 'employer-register'
  | 'worker-onboarding'
  | 'employer-onboarding'
  | null

export type Page = 'home' | 'team' | 'gallery' | 'news' | 'worker-dashboard' | 'employer-dashboard' | 'book-worker'

type AppCtx = {
  view: AuthView
  open: (v: AuthView) => void
  close: () => void
  page: Page
  go: (p: Page) => void
  logout: () => void
}

const Ctx = createContext<AppCtx>({
  view: null, open: () => {}, close: () => {}, page: 'home', go: () => {}, logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore the page the user was actually on before a refresh — not just any
  // page a stored token could reach. A visitor who lands on the homepage with an
  // old token still sees the homepage; only someone who was on a dashboard, and
  // still holds the matching token, is returned there.
  const initialPage = (): Page => {
    try {
      // New booking window opened via window.open with ?page=book-worker
      const urlPage = new URLSearchParams(window.location.search).get('page')
      if (urlPage === 'book-worker' && session.employerToken()) return 'book-worker'
      const last = localStorage.getItem('bx_view')
      if (last === 'worker-dashboard' && session.workerToken()) return 'worker-dashboard'
      if (last === 'employer-dashboard' && session.employerToken()) return 'employer-dashboard'
    } catch { /* storage unavailable */ }
    return 'home'
  }

  const [view, setView] = useState<AuthView>(() => {
    if (typeof window === 'undefined') return null

    // Anyone arriving with ?ref= in the URL followed a worker's referral link
    // and is here to sign up — open registration for them straight away.
    const hadRefInUrl = new URLSearchParams(window.location.search).has('ref')
    const code = referral.capture()
    return code && hadRefInUrl ? 'worker-register' : null
  })
  const [page, setPage] = useState<Page>(initialPage)

  const persistView = (p: Page) => {
    try {
      if (p === 'worker-dashboard' || p === 'employer-dashboard') localStorage.setItem('bx_view', p)
      else localStorage.removeItem('bx_view')
    } catch { /* storage unavailable */ }
  }

  const logout = () => {
    if (page === 'worker-dashboard') session.logoutWorker()
    if (page === 'employer-dashboard') session.logoutEmployer()
    setView(null)
    setPage('home')
    persistView('home')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const go = (p: Page) => {
    setView(null)
    setPage(p)
    persistView(p)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <Ctx.Provider value={{ view, open: setView, close: () => setView(null), page, go, logout }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx)
