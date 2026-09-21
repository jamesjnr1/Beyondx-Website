import { useEffect, useRef } from 'react'

// Re-runs `onResume` whenever the app comes back to the foreground — the
// user switches back to this tab, or (for the installed PWA) reopens it
// from the home screen after it was backgrounded. Without this, a
// dashboard only ever fetches once on mount: a coordinator can sit on a
// stale job-request list for hours unless they force-quit and relaunch the
// app, since a backgrounded page does nothing on its own to notice new
// data arrived server-side.
//
// Debounced to at most once per `minIntervalMs` (default 10s) so rapid
// tab-switching or focus/visibilitychange/pageshow firing together for the
// same resume doesn't trigger duplicate fetches.
export function useRefreshOnResume(onResume: () => void, minIntervalMs = 10_000) {
  const lastRun = useRef(0)

  useEffect(() => {
    const maybeRun = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRun.current < minIntervalMs) return
      lastRun.current = now
      onResume()
    }

    document.addEventListener('visibilitychange', maybeRun)
    window.addEventListener('focus', maybeRun)
    window.addEventListener('pageshow', maybeRun)
    return () => {
      document.removeEventListener('visibilitychange', maybeRun)
      window.removeEventListener('focus', maybeRun)
      window.removeEventListener('pageshow', maybeRun)
    }
  }, [onResume, minIntervalMs])
}
