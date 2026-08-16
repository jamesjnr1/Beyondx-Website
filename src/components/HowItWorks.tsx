import { motion } from 'framer-motion'
import { ClipboardList, UserCheck, MapPin, Banknote } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { steps } from '../data'

const ICONS = [ClipboardList, UserCheck, MapPin, Banknote]

export default function HowItWorks() {
  const { ref, visible } = useReveal()

  return (
    <section id="how" ref={ref} className="relative bg-cream-100 py-14 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">

        {/* Header */}
        <div className="mx-auto max-w-xl text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            The process
          </span>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            From task to payment in{' '}
            <span className="italic gradient-text">four steps</span>
          </h2>
          <p className="mt-4 text-base text-ink-700 text-pretty sm:text-lg">
            No paperwork, no middlemen. A clear path from posting a job to settling payment through mobile money.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-12 sm:mt-16">

          {/* Connector line — desktop only, sits behind the icon nodes */}
          <div className="relative hidden lg:block">
            <div className="absolute top-6 left-0 right-0 mx-auto h-px bg-ink-900/10" style={{ width: 'calc(100% - 96px)', left: '48px' }} />
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {steps.map((step, i) => {
              const Icon = ICONS[i]
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  animate={visible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative flex flex-col"
                >
                  {/* Icon node */}
                  <div className="mb-5 flex items-center gap-4 lg:flex-col lg:items-start lg:gap-0">
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-600 shadow-sm shadow-forest-900/20 lg:mb-5">
                      <Icon size={20} className="text-cream-50" aria-hidden="true" />
                    </div>
                    {/* Mobile: step number beside icon */}
                    <span className="font-serif text-4xl font-light text-ink-900/10 lg:hidden">
                      {step.number}
                    </span>
                  </div>

                  {/* Text */}
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-clay-500">
                    Step {step.number}
                  </p>
                  <h3 className="mb-2 font-serif text-lg font-semibold leading-snug text-ink-900">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-700/75">
                    {step.description}
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
