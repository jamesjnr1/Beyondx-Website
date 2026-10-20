import { motion } from 'framer-motion'
import { ShieldCheck, UserCheck, Hammer, Star, TrendingUp } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'

const chain = [
  { icon: ShieldCheck, label: 'Verified' },
  { icon: UserCheck, label: 'Assigned' },
  { icon: Hammer, label: 'Performs' },
  { icon: Star, label: 'Reviewed' },
  { icon: TrendingUp, label: 'Performance record updated' },
]

export default function TrustChain() {
  const { ref, visible } = useReveal()

  return (
    <section ref={ref} className="relative bg-cream-50 py-14 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            How we build trust
          </span>
          <h2 className="font-serif text-2xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            How BeyondX{' '}
            <span className="italic gradient-text">verifies Xperts.</span>
          </h2>
          <p className="mt-4 text-base text-ink-700 text-pretty sm:text-lg">
            We do not just ask whether someone says they can do the job. We verify
            their information and build a record of their performance over time.
          </p>
        </div>

        <div className="mt-12 sm:mt-16">
          <div className="relative hidden sm:block">
            <div
              className="absolute top-6 h-px bg-ink-900/10"
              style={{ width: 'calc(100% - 96px)', left: '48px' }}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-5 sm:gap-4">
            {chain.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={visible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-row items-center gap-3 sm:flex-col sm:items-center sm:text-center"
                >
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-600 shadow-sm shadow-forest-900/20">
                    <Icon size={20} className="text-cream-50" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-ink-900 sm:mt-3">
                    {step.label}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
