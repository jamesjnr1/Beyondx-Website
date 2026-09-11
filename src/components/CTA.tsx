import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { ArrowRight } from 'lucide-react'
import { useAuth } from './auth/AuthContext'

export default function CTA() {
  const { ref, visible } = useReveal()
  const { open } = useAuth()

  return (
    <section id="cta" ref={ref} className="relative h-[480px] overflow-hidden sm:h-[560px]">
      <motion.img
        initial={{ scale: 1.08 }}
        animate={visible ? { scale: 1 } : {}}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        src="/categories/hospitality.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/55 to-ink-950/40" />

      <div className="relative flex h-full flex-col items-center justify-center px-5 text-center sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <h2 className="font-serif text-3xl font-medium leading-tight text-cream-50 text-balance sm:text-5xl">
            Building Ghana's verified workforce,{' '}
            <span className="italic text-clay-300">one job at a time.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-cream-200/85 text-pretty">
            Join employers across Ghana building better businesses —
            and better futures — through BeyondX.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => open('employer-login')}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-cream-50 px-8 py-4 text-base font-semibold text-forest-700 shadow-lg transition-all hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-50/70"
            >
              Hire a worker
              <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => open('worker-login')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-cream-50/40 px-8 py-4 text-base font-medium text-cream-50 backdrop-blur-sm transition-colors hover:bg-cream-50/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-50/70"
            >
              I'm looking for work
            </button>
          </div>
          <p className="mt-5 text-sm text-cream-200/70">
            Already have an account?{' '}
            <button type="button" onClick={() => open('worker-login')} className="text-clay-300 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-50/70">Sign in</button>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
