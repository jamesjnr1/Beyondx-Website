import { motion } from 'framer-motion'
import { TrendingUp, Wallet } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'

const ranks = ['Bronze', 'Silver', 'Gold']

export default function PlatformDesign() {
  const { ref, visible } = useReveal()

  return (
    <section ref={ref} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            Platform Design
          </span>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            Built for progression, transparency, and{' '}
            <span className="italic gradient-text">trust.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-ink-900/8 bg-cream-50 p-8 shadow-sm"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-forest-600/10">
              <TrendingUp size={22} aria-hidden="true" className="text-forest-600" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-ink-900">Rank Progression</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              Workers advance through Bronze, Silver, and Gold ranks. Higher ranks
              unlock higher-paying contracts. Every completed task and positive
              rating moves a worker forward.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {ranks.map((r, i) => (
                <span key={r} className="flex items-center gap-2">
                  <span className="rounded-full bg-forest-600/10 px-3 py-1 text-xs font-semibold text-forest-700">{r}</span>
                  {i < ranks.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-ink-900/15" />}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="rounded-2xl border border-ink-900/8 bg-cream-50 p-8 shadow-sm"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-forest-600/10">
              <Wallet size={22} aria-hidden="true" className="text-forest-600" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-ink-900">In-App Payments</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              All payments are processed through the BeyondX platform. Every
              transaction is tracked. A 15% platform commission is deducted per
              transaction to sustain programme operations.
            </p>
            <div className="mt-6 flex gap-3">
              <div className="flex-1 rounded-xl bg-forest-600/5 p-3 text-center">
                <span className="block font-serif text-2xl font-semibold text-forest-700">85%</span>
                <span className="text-xs text-ink-700">To the worker</span>
              </div>
              <div className="flex-1 rounded-xl bg-ink-900/5 p-3 text-center">
                <span className="block font-serif text-2xl font-semibold text-ink-900">15%</span>
                <span className="text-xs text-ink-700">Platform commission</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
