import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import { useAuth, type Page } from './auth/AuthContext'

const tabs: { label: string; page: Page }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Meet the Team', page: 'team' },
  { label: 'Gallery', page: 'gallery' },
  { label: 'News & Events', page: 'news' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { open: openAuth, page, go } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onHero = page === 'home'
  const solid = scrolled || !onHero
  const dark = !solid

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        solid ? 'bg-cream-50/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
      style={{ top: 'var(--bx-banner-h, 0px)' }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <button onClick={() => go('home')} aria-label="BeyondX home">
          <Logo tone={dark ? 'light' : 'dark'} />
        </button>

        {/* Page links: plain text; the current page is bolder, coloured and marked with a small dot. */}
        <div className="hidden items-center gap-9 md:flex">
          {tabs.map((t) => {
            const active = page === t.page
            return (
              <button
                key={t.page}
                onClick={() => go(t.page)}
                aria-current={active ? 'page' : undefined}
                className={`relative py-1 text-sm transition-colors ${
                  active
                    ? dark ? 'font-semibold text-white' : 'font-semibold text-forest-700'
                    : dark ? 'font-medium text-cream-100/80 hover:text-white' : 'font-medium text-ink-700 hover:text-ink-900'
                }`}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className={`absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${dark ? 'bg-forest-300' : 'bg-forest-600'}`}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => openAuth('worker-login')}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
              dark ? 'border-cream-50/30 text-cream-50 hover:bg-cream-50/10' : 'border-ink-900/15 text-ink-800 hover:bg-ink-900/5'
            }`}
          >
            Worker Login
          </button>
          <button
            onClick={() => openAuth('employer-login')}
            className="rounded-full bg-forest-600 px-5 py-2 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.97]"
          >
            Employer Login
          </button>
        </div>

        <button onClick={() => setOpen(!open)} className={`rounded-lg p-2 md:hidden ${dark ? 'text-cream-50' : 'text-ink-900'}`} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-cream-50/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {tabs.map((t) => (
                <button
                  key={t.page}
                  onClick={() => { setOpen(false); go(t.page) }}
                  className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium ${page === t.page ? 'bg-forest-600/5 text-forest-700' : 'text-ink-700 hover:bg-forest-600/5 hover:text-forest-600'}`}
                >
                  {t.label}
                </button>
              ))}
              <button onClick={() => { setOpen(false); openAuth('worker-login') }} className="mt-2 rounded-full border border-ink-900/15 px-5 py-2.5 text-center text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5">
                Worker Login
              </button>
              <button onClick={() => { setOpen(false); openAuth('employer-login') }} className="rounded-full bg-forest-600 px-5 py-2.5 text-center text-sm font-semibold text-cream-50">
                Employer Login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
