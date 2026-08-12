import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../lib/api'

const GOOGLE_CLIENT_ID = '734556015709-g7a9iirge436una0ahdgkd2fsm1sju8a.apps.googleusercontent.com'

export type GoogleProfile = { email: string; name: string; picture: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

/**
 * Renders Google's own "Sign in with Google" button and, once someone uses
 * it, sends the credential to our server to be verified against Google
 * before trusting anything in it. The verified email is what fills in the
 * registration form — not anything read directly off the token in the
 * browser, since that could be tampered with before it reaches us.
 */
export default function GoogleSignInButton({
  onVerified,
  onError,
}: {
  onVerified: (profile: GoogleProfile) => void
  onError: (message: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const init = () => {
      if (cancelled || !window.google || !ref.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            const r = await fetch('/api/google-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential }),
            })
            const text = await r.text()
            let data: unknown = null
            try { data = text ? JSON.parse(text) : null } catch { /* non-JSON */ }
            if (!r.ok) {
              const msg = (data as { error?: string })?.error || 'Could not verify that sign-in.'
              throw new ApiError(msg, r.status)
            }
            const d = data as { email: string; name: string; picture: string }
            onVerified({ email: d.email, name: d.name, picture: d.picture })
          } catch (e) {
            onError(e instanceof ApiError ? e.message : 'Could not verify that sign-in. Please try again.')
          }
        },
      })
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signup_with',
      })
      setReady(true)
    }

    if (window.google) {
      init()
    } else {
      // The script tag loads async — poll briefly until it's ready rather
      // than requiring callers to coordinate load order.
      const id = window.setInterval(() => { if (window.google) { window.clearInterval(id); init() } }, 150)
      return () => { cancelled = true; window.clearInterval(id) }
    }
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div ref={ref} className="flex justify-center" />
      {!ready && (
        <div className="flex h-10 w-full items-center justify-center rounded-lg border border-ink-900/15 text-xs text-ink-700/60">
          Loading Google sign-in…
        </div>
      )}
    </div>
  )
}
