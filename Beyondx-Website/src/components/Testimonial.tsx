import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { Quote } from 'lucide-react'

export default function Testimonial() {
  const { ref, visible } = useReveal()

  return (
    <section ref={ref} className="relative overflow-hidden py-14 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest-400/8 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            A Message From Our CEO
          </span>
          <Quote size={28} aria-hidden="true" className="mx-auto mb-4 text-clay-400/50 sm:mb-6 sm:size-10" />

          <blockquote className="font-serif text-lg font-medium leading-relaxed text-ink-900 text-pretty sm:text-3xl lg:text-4xl">
            "BeyondX exists because a record should mark where someone has been,
            not where they're stuck. Every job completed on our platform
            builds proof of skill and reliability — the kind that gets someone
            past the one mark that's followed them for years.{' '}
            <span className="italic gradient-text">Same hands, new start.</span>"
          </blockquote>

          <div className="mt-5 flex flex-col items-center gap-2 sm:mt-8 sm:gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-forest-500 to-forest-700 font-serif text-base font-bold text-cream-50 shadow-md sm:h-14 sm:w-14 sm:text-lg">
              SA
            </div>
            <div>
              <div className="font-semibold text-ink-900">Spencer Amoo-Yankey</div>
              <div className="text-sm text-ink-700/70">
                Chief Executive Officer, BeyondX
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
