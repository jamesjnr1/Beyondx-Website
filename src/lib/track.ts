// src/lib/track.ts
//
// Self-hosted visitor tracking — deliberately not Vercel Analytics. Assigns
// each browser a stable anonymous ID (kept in localStorage) and pings our
// own backend once per session. When that same visitor later registers as
// a worker or employer, the registration call sends this same ID so the
// backend can link the two — giving a real visit -> signup conversion
// number instead of two disconnected counts.

const STORAGE_KEY = 'bx_visitor_id'
const API = 'https://beyondx-backend-production-1a08.up.railway.app'

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable (private browsing, etc.) — use a per-load
    // id so tracking still works, just without cross-visit continuity.
    return crypto.randomUUID()
  }
}

export function trackVisit() {
  try {
    const visitorId = getVisitorId()
    fetch(`${API}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        path: window.location.pathname,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {
      // Tracking must never be visible to the user if it fails.
    })
  } catch {
    // Never let tracking break the app.
  }
}
