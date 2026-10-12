import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { ArrowRight } from 'lucide-react'
import { useAuth } from './auth/AuthContext'

export default function CTA() {
  const { ref, visible } = useReveal()
  const { open } = useAuth()

  return (
    <section id="cta" ref={ref} className="relative overflow-hidden py-14 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl bg-forest-700 p-8 text-center grain sm:p-16"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-forest-400/20 blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-clay-400/15 blur-[80px]" />
          </div>

          <div className="relative z-10">
            <h2 className="font-serif text-3xl font-medium leading-tight text-cream-50 text-balance sm:text-4xl lg:text-5xl">
              Ready to{' '}
              <span className="italic text-clay-300">hire with purpose?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-cream-200/80 text-pretty">
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
                className="inline-flex items-center justify-center gap-2 rounded-full border border-cream-50/30 px-8 py-4 text-base font-medium text-cream-50 transition-colors hover:bg-cream-50/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-50/70"
              >
                I'm looking for work
              </button>
            </div>
            <p className="mt-5 text-sm text-cream-200/60">
              Already have an account?{' '}
              <button type="button" onClick={() => open('worker-login')} className="text-clay-300 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-50/70">Sign in</button>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
