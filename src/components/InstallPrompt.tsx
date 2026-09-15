import { useEffect, useState } from 'react'
import { Download, MoreVertical, Share, X } from 'lucide-react'

type Device = 'ios' | 'android' | 'desktop'

const DISMISS_KEY = 'bx-install-dismissed-at'
const DISMISS_DAYS = 14

function detectDevice(): Device {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) && !('MSStream' in window)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function wasRecentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [device, setDevice] = useState<Device>('desktop')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return
    setDevice(detectDevice())

    const w = window as typeof window & { __bxInstallPrompt?: BeforeInstallPromptEvent }
    if (w.__bxInstallPrompt) setDeferredPrompt(w.__bxInstallPrompt)

    const onReady = () => setDeferredPrompt(w.__bxInstallPrompt ?? null)
    const onInstalled = () => {
      setVisible(false)
      localStorage.removeItem(DISMISS_KEY)
    }
    window.addEventListener('bx-install-prompt-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)

    const timer = window.setTimeout(() => setVisible(true), 2500)

    return () => {
      window.removeEventListener('bx-install-prompt-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
      window.clearTimeout(timer)
    }
  }, [])

  // Nothing actionable to tell a desktop visitor unless the browser has
  // actually offered an install (Chrome/Edge). Safari/Firefox desktop have
  // no install path, so stay silent there instead of showing dead advice.
  if (!visible || (device === 'desktop' && !deferredPrompt)) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    dismiss()
  }

  return (
    <div
      role="dialog"
      aria-label="Install BeyondX"
      className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm rounded-2xl border border-ink-900/10 bg-cream-50 p-4 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:left-auto"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-ink-700 transition-colors hover:bg-ink-900/5"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-5">
        <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-serif text-base font-medium text-ink-900">Install BeyondX</p>

          {deferredPrompt ? (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-700">
              Add it to your home screen for one-tap access, even with a poor connection.
            </p>
          ) : device === 'ios' ? (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-700">
              Tap <Share size={13} className="inline -mt-0.5" aria-hidden="true" /> Share, then{' '}
              <span className="font-medium text-ink-900">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-700">
              Tap <MoreVertical size={13} className="inline -mt-0.5" aria-hidden="true" /> menu, then{' '}
              <span className="font-medium text-ink-900">Install app</span>.
            </p>
          )}
        </div>
      </div>

      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/50"
        >
          <Download size={16} aria-hidden="true" />
          Install app
        </button>
      )}
    </div>
  )
}
