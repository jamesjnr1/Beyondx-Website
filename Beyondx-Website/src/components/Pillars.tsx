import { motion } from 'framer-motion'
import { MoveHorizontal } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { pillars } from '../data'

export default function Pillars() {
  const { ref, visible } = useReveal()

  return (
    <section
      id="principles"
      ref={ref}
      className="relative overflow-hidden bg-ink-900 py-14 grain sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-300 sm:mb-4">
            Our principles
          </span>
          <h2 className="font-serif text-2xl font-medium leading-tight text-cream-50 text-balance sm:text-4xl lg:text-5xl">
            Built on{' '}
            <span className="italic gradient-text">three pillars</span>
          </h2>
          <p className="mt-3 text-base text-cream-200/70 text-pretty sm:mt-4 sm:text-lg">
            Every decision in BeyondX is shaped by these principles.
          </p>
        </div>

        {/* Three items never sit well in a grid on a phone — either two
            columns leave one stranded, or one column stacks the full height
            of all three. A swipeable row keeps all three reachable within
            the height of a single card instead. Desktop keeps the familiar
            3-column grid since there's room for it. */}
        <div className="mt-8 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mt-16 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="h-full w-[78%] shrink-0 snap-center rounded-2xl border border-cream-50/10 bg-cream-50/5 p-5 text-center transition-all duration-300 hover:border-forest-400/30 hover:bg-cream-50/10 sm:w-auto sm:shrink sm:p-8"
            >
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-forest-400 to-forest-600 shadow-lg shadow-forest-900/40 sm:mb-5 sm:h-14 sm:w-14 sm:rounded-2xl">
                <span className="font-serif text-base font-bold text-cream-50 sm:text-xl">
                  {i + 1}
                </span>
              </div>
              <h3 className="mb-2 font-serif text-lg font-medium text-cream-50 sm:mb-3 sm:text-2xl">
                {pillar.title}
              </h3>
              <p className="text-xs leading-relaxed text-cream-200/70 text-pretty sm:text-sm">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-cream-100 sm:hidden">
          <MoveHorizontal size={14} aria-hidden="true" className="text-forest-400" />
          Swipe to see all three
        </p>
      </div>
    </section>
  )
}
