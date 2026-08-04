import { useEffect, useRef, useState } from 'react'
import { MapPin, MapPinOff, LoaderCircle } from 'lucide-react'

const SHARE_EVERY_MS = 60_000

type Props = {
  taskId: string | number
  workerId?: string
  workerName?: string
  /** Start sharing immediately — worker already granted permission in the accept modal */
  autoStart?: boolean
  /** Remote work has no job site, so there is nothing to track. */
  disabled?: boolean
}

/**
 * Shares the worker's position with their employer while a job is in progress.
 *
 * Deliberately opt-in and reversible: nothing is sent until the worker turns it
 * on, it stops the moment they turn it off or leave the dashboard, and the
 * stored position is deleted rather than kept as history.
 */
export default function LocationShare({ taskId, workerId, workerName, disabled, autoStart }: Props) {
  const [sharing, setSharing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSent, setLastSent] = useState<Date | null>(null)
  const watchRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const latest = useRef<GeolocationPosition | null>(null)

  const send = async (pos: GeolocationPosition) => {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          workerId,
          workerName,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      })
      setLastSent(new Date())
    } catch {
      /* a dropped update is not worth interrupting the worker over */
    }
  }

  const stop = async (tellServer = true) => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setSharing(false)
    setLastSent(null)
    if (tellServer) {
      try {
        await fetch(`/api/location?taskId=${encodeURIComponent(String(taskId))}`, { method: 'DELETE' })
      } catch { /* ignore */ }
    }
  }

  const start = () => {
    if (!('geolocation' in navigator)) {
      setError('This phone does not support location sharing.')
      return
    }
    setError(null)
    setBusy(true)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        setSharing(true)
        latest.current = pos
        send(pos)

        watchRef.current = navigator.geolocation.watchPosition(
          (p) => { latest.current = p },
          () => { /* keep the last good position */ },
          { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
        )
        // Send on a timer rather than on every movement — kinder to battery and data.
        timerRef.current = window.setInterval(() => {
          if (latest.current) send(latest.current)
        }, SHARE_EVERY_MS)
      },
      (err) => {
        setBusy(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. You can allow it in your browser settings.'
            : 'Could not get your location. Check that location is switched on.',
        )
      },
      { enableHighAccuracy: true, timeout: 20_000 },
    )
  }

  // Never keep sharing after the worker navigates away.
  useEffect(() => () => { stop(false) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // If the worker already granted permission in the accept modal, start immediately
  useEffect(() => {
    if (autoStart && !sharing && !busy) start()
  }, [autoStart])   // eslint-disable-line react-hooks/exhaustive-deps

  if (disabled) return null

  // If already sharing (auto-started from accept), just show the live status quietly
  // without the "Share location" button prompt
  if (sharing) {
    return (
      <div className="mt-3 border-t border-ink-900/10 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs text-ink-700">
            <MapPin size={13} aria-hidden="true" className="shrink-0 text-forest-600" />
            <span>
              Location sharing active.{' '}
              {lastSent && <span className="text-ink-700/60">Updated {lastSent.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</span>}
            </span>
          </p>
          <button
            onClick={() => stop()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-900/15 px-3.5 py-1.5 text-xs font-semibold text-ink-800 transition-all hover:bg-ink-900/5 active:scale-[0.98]"
          >
            Stop sharing
          </button>
        </div>
      </div>
    )
  }

  // Not yet sharing — show the prompt
  return (
    <div className="mt-3 border-t border-ink-900/10 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-700">
          <MapPinOff size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-700/60" />
          <span>Share your location so BeyondX can verify you are on-site.</span>
        </p>
        <button
          onClick={start}
          disabled={busy}
          aria-pressed={false}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest-600 px-3.5 py-1.5 text-xs font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60"
        >
          {busy && <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />}
          {busy ? 'Starting…' : 'Share location'}
        </button>
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-700">{error}</p>}
    </div>
  )
}
