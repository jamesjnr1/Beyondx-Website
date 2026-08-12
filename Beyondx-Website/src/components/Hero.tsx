import { motion } from 'framer-motion'
import { useAuth } from './auth/AuthContext'

export default function Hero() {
  const { open } = useAuth()
  return (
    <section id="top" className="relative h-screen min-h-[600px] w-full overflow-hidden">
      <motion.div
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <picture>
          {/* Portrait crop for phones; the wider landscape shot from 640px up. */}
          <source media="(max-width: 639px)" srcSet="/hero-mobile.jpg" />
          <img
            src="/hero.jpg"
            alt="A BeyondX worker on a job site in Greater Accra"
            className="h-full w-full object-cover"
            loading="eager"
          />
        </picture>
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/25 to-ink-950/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/75 via-ink-950/30 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-end pb-20 sm:pb-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-2xl"
          >
            <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-cream-200/80">
              Skills-Verified Hiring
            </p>
            <h1 className="font-serif text-5xl font-medium leading-[1.05] text-cream-50 text-balance sm:text-6xl lg:text-7xl">
              Same Hands.
              <span className="block italic gradient-text">New Start.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream-200/90 text-pretty">
              BeyondX connects Greater Accra employers with vetted, skill-matched
              workers — verified, ready to work, and hired on merit.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <button
              onClick={() => open('employer-login')}
              className="rounded-full bg-cream-50 px-7 py-3.5 text-base font-semibold text-ink-900 transition-all hover:bg-cream-100 active:scale-[0.98]"
            >
              Hire a worker
            </button>
            <button
              onClick={() => open('worker-login')}
              className="rounded-full border border-cream-50/40 px-7 py-3.5 text-base font-semibold text-cream-50 backdrop-blur-sm transition-all hover:bg-cream-50/10 active:scale-[0.98]"
            >
              I'm looking for work
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
