import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { session } from '../lib/api'
import { enablePush, getPushStatus, type PushStatus } from '../lib/push'

const DISMISS_KEY = 'bx-notif-banner-dismissed-at'
const DISMISS_DAYS = 7

function wasRecentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

// A visible, in-content banner at the top of the dashboard — not another
// fixed floating card competing with the install prompt and accessibility
// button for screen corners. Enabling push still requires this exact click
// (browsers refuse a permission request that didn't come from one), but
// tucking that click inside the notifications-bell dropdown turned out to
// be too easy to miss entirely. This is the loud version of the same action.
export default function NotificationsBanner({ role }: { role: 'worker' | 'employer' }) {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed)

  useEffect(() => {
    getPushStatus().then(setStatus).catch(() => setStatus('unsupported'))
  }, [])

  if (dismissed || !status || status === 'unsupported' || status === 'denied' || status === 'subscribed') {
    return null
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  const handleEnable = async () => {
    const token = role === 'worker' ? session.workerToken() : session.employerToken()
    if (!token || busy) return
    setBusy(true)
    try {
      const next = await enablePush(token)
      setStatus(next)
      if (next === 'subscribed') dismiss()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-forest-600/20 bg-forest-600/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600/15 text-forest-700">
          <Bell size={16} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">Turn on notifications</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-700">
            {status === 'ios-needs-install'
              ? 'On iPhone, add BeyondX to your Home Screen first (Share → Add to Home Screen) — Safari only allows notifications for installed apps, not a regular tab.'
              : role === 'worker'
                ? 'Get an alert the moment a new job or offer comes in, even when the app is closed.'
                : 'Get an alert the moment a worker responds, so you never miss it.'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {status === 'not-subscribed' && (
          <button
            onClick={handleEnable}
            disabled={busy}
            className="rounded-full bg-forest-600 px-4 py-2 text-xs font-semibold text-cream-50 transition-colors hover:bg-forest-500 disabled:opacity-60"
          >
            {busy ? 'Enabling…' : 'Enable notifications'}
          </button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" className="rounded-lg p-1.5 text-ink-700/60 hover:bg-ink-900/5 hover:text-ink-900">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
