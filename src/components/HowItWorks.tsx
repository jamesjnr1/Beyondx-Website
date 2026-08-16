import { motion } from 'framer-motion'
import { ClipboardList, UserCheck, MapPin, Banknote } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { steps } from '../data'

const ICONS = [ClipboardList, UserCheck, MapPin, Banknote]

export default function HowItWorks() {
  const { ref, visible } = useReveal()

  return (
    <section
      id="how"
      ref={ref}
      className="relative overflow-hidden bg-cream-100 py-14 sm:py-28"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Header */}
        <div className="mx-auto max-w-xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            The process
          </span>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            From task to payment in{' '}
            <span className="italic gradient-text">four steps</span>
          </h2>
          <p className="mt-4 text-base text-ink-700 text-pretty sm:text-lg">
            No paperwork, no middlemen. A clear path from posting a job to
            settling payment through mobile money.
          </p>
        </div>

        {/* Timeline — desktop: alternating left/right. Mobile: single column */}
        <div className="relative mt-14 sm:mt-20">

          {/* Vertical spine — visible on sm+ only */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 hidden h-full w-px -translate-x-1/2 bg-ink-900/8 sm:block"
          />

          <div className="flex flex-col gap-0">
            {steps.map((step, i) => {
              const Icon = ICONS[i]
              const isLeft = i % 2 === 0  // even steps go on the left
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 24 }}
                  animate={visible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: i * 0.13 }}
                  className={`relative flex items-center gap-6 py-6 sm:py-10 ${
                    isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}
                >
                  {/* Content card */}
                  <div className={`flex-1 ${isLeft ? 'sm:text-right' : 'sm:text-left'}`}>
                    <div className={`inline-block rounded-2xl border border-ink-900/8 bg-cream-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-7 ${
                      isLeft ? 'sm:ml-auto' : 'sm:mr-auto'
                    } w-full sm:max-w-sm`}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-clay-500">
                        Step {step.number}
                      </p>
                      <h3 className="mb-2 font-serif text-lg font-semibold leading-snug text-ink-900 sm:text-xl">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-ink-700/80">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Centre node — spine dot + icon */}
                  <div className="relative z-10 hidden shrink-0 flex-col items-center sm:flex">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 shadow-md shadow-forest-900/20">
                      <Icon size={20} className="text-cream-50" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Mobile: step pill + icon inline */}
                  <div className="flex shrink-0 flex-col items-center sm:hidden">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-600 shadow-sm">
                      <Icon size={16} className="text-cream-50" aria-hidden="true" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="mt-1 h-full w-px bg-ink-900/10" style={{ minHeight: 32 }} />
                    )}
                  </div>

                  {/* Spacer to balance the alternating layout */}
                  <div className="hidden flex-1 sm:block" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
