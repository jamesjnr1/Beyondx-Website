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
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solid ? 'bg-cream-50/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <button onClick={() => go('home')} aria-label="BeyondX home">
          <Logo tone={dark ? 'light' : 'dark'} />
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {tabs.map((t) => {
            const active = page === t.page
            return (
              <button
                key={t.page}
                onClick={() => go(t.page)}
                className={`group relative text-sm font-medium transition-colors ${
                  dark ? 'text-cream-200/90 hover:text-cream-50' : active ? 'text-forest-700' : 'text-ink-700 hover:text-forest-600'
                }`}
              >
                {t.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-clay-400 transition-all duration-300 ${active && !dark ? 'w-full' : 'w-0 group-hover:w-full'}`} />
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
