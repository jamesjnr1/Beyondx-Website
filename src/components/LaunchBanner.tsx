import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAuth } from './auth/AuthContext'

const DISMISS_KEY = 'bx_launch_banner_dismissed'

// The Navbar is position:fixed and reads --bx-banner-h to know how far to
// sit below this banner (see Navbar.tsx). Keeping them in sync via a CSS
// custom property avoids prop-drilling between two unrelated siblings and
// self-corrects if the banner's height ever changes (text wrap, etc.).
function setBannerHeightVar(px: number) {
  document.documentElement.style.setProperty('--bx-banner-h', `${px}px`)
}

export default function LaunchBanner() {
  const [visible, setVisible] = useState(false)
  const { go } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
    return () => setBannerHeightVar(0)
  }, [])

  useEffect(() => {
    if (!visible || !ref.current) { setBannerHeightVar(0); return }
    const el = ref.current
    const update = () => setBannerHeightVar(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { ro.disconnect(); setBannerHeightVar(0) }
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    setBannerHeightVar(0)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={ref}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-x-0 top-0 z-[60] bg-ink-900"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-5 py-2.5 sm:px-8">
            <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[13px] font-medium text-cream-50 sm:text-sm">
              <span aria-hidden="true">🎉</span>
              <span>BeyondX is officially live in Greater Accra.</span>
              <button
                onClick={() => go('news')}
                className="font-semibold text-forest-400 underline decoration-forest-400/40 underline-offset-2 transition-colors hover:text-forest-300"
              >
                Read the announcement →
              </button>
            </p>
            <button
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="ml-1 shrink-0 rounded-full p-1 text-cream-50/50 transition-colors hover:bg-white/10 hover:text-cream-50"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
