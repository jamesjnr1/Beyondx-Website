import { motion } from 'framer-motion'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useAuth } from './auth/AuthContext'

// Cities BeyondX is either live in today or building toward next. Kept
// honest rather than aspirational-as-fact: only Greater Accra is marked
// "Live" (matches Hero/About/Footer copy elsewhere on the site); the rest
// are visibly muted as reach, not a claim of current operation there.
const REACH = [
  { name: 'Greater Accra', status: 'Live' as const },
  { name: 'Tema', status: 'Next' as const },
  { name: 'Kumasi', status: 'Next' as const },
  { name: 'Takoradi', status: 'Next' as const },
  { name: 'Ho', status: 'Next' as const },
]

/** A ring of orbiting city nodes around a central BeyondX mark — a network/
 *  reach motif rather than a literal map, so it never overstates where the
 *  platform actually operates. */
function ReachDial() {
  const n = REACH.length
  const radius = 42 // percent of the square box
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      {/* Outer dashed ring */}
      <div className="absolute inset-0 rounded-full border border-dashed border-forest-600/25" />
      {/* Inner soft ring */}
      <div className="absolute inset-[14%] rounded-full border border-forest-600/15 bg-forest-600/5" />

      {/* Center mark */}
      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-forest-500 to-forest-700 shadow-lg shadow-forest-900/25">
        <MapPin size={28} className="text-cream-50" aria-hidden="true" />
      </div>

      {/* Orbiting nodes */}
      {REACH.map((city, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2
        const x = 50 + radius * Math.cos(angle)
        const y = 50 + radius * Math.sin(angle)
        const live = city.status === 'Live'
        return (
          <div
            key={city.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                  live ? 'bg-forest-600 ring-4 ring-forest-600/20' : 'bg-ink-900/25'
                }`}
              >
                {live && <span className="h-1.5 w-1.5 rounded-full bg-cream-50" />}
              </span>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                live ? 'bg-forest-600/10 text-forest-700' : 'text-ink-700/50'
              }`}>
                {city.name}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Intro() {
  const { ref, visible } = useReveal()
  const { open } = useAuth()

  return (
    <section ref={ref} className="relative overflow-hidden bg-cream-100 py-14 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500 sm:mb-4">
            Who we are
          </span>
          <h2 className="font-serif text-2xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-[2.75rem]">
            We blend{' '}
            <span className="italic gradient-text">second-chance hiring</span>{' '}
            with verification technology to transform local work.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-700 text-pretty sm:mt-6 sm:text-lg">
            BeyondX is built on a simple belief: a background check should
            confirm someone is fit to work, not decide they never get the
            chance to. Every worker on the platform — regardless of what
            brought them here — is vetted the same way, tracked the same
            way, and paid the same way.
          </p>
          <button
            onClick={() => open('employer-login')}
            className="group mt-7 inline-flex items-center gap-2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-ink-800 active:scale-[0.98] sm:mt-8"
          >
            Start hiring
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={visible ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <ReachDial />
          <p className="mx-auto mt-6 max-w-xs text-center text-sm text-ink-700/70">
            <span className="font-semibold text-forest-700">Live in Greater Accra</span> today —
            built to scale across Ghana.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
