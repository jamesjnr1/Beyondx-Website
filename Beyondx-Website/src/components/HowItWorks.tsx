import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { steps } from '../data'

export default function HowItWorks() {
  const { ref, visible } = useReveal()

  return (
    <section
      id="how"
      ref={ref}
      className="relative overflow-hidden bg-cream-100 py-14 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            The process
          </span>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            From task to payment in{' '}
            <span className="italic gradient-text">four steps</span>
          </h2>
          <p className="mt-4 text-lg text-ink-700 text-pretty">
            No paperwork, no middlemen. Just a clear path from posting a job to
            settling payment through mobile money.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-16 sm:gap-6 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="group relative"
            >
              <div className="h-full rounded-xl border border-ink-900/8 bg-cream-50 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:rounded-2xl sm:p-6">
                <div className="mb-1.5 font-serif text-2xl font-bold text-clay-400/40 transition-colors group-hover:text-clay-500 sm:mb-4 sm:text-5xl">
                  {step.number}
                </div>
                <h3 className="mb-1 text-[13px] font-semibold leading-tight text-ink-900 sm:mb-2 sm:text-lg">
                  {step.title}
                </h3>
                <p className="text-xs leading-snug text-ink-700/80 sm:text-sm sm:leading-relaxed">
                  {step.description}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-clay-400/40 lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
