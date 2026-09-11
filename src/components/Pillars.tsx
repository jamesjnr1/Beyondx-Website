import { motion } from 'framer-motion'
import { MoveHorizontal, ArrowUpRight } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { pillars } from '../data'

// Real jobsite photography per pillar — chosen for the mood of each
// principle rather than the literal category (these three pillars aren't
// category-specific, so any of the site's existing worker photos apply).
const IMAGES = ['/categories/facility-cleaning.jpg', '/categories/general-labour.jpg', '/categories/painting.jpg']

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
              className="img-zoom group relative h-[340px] w-[78%] shrink-0 snap-center overflow-hidden rounded-2xl sm:h-[420px] sm:w-auto sm:shrink"
            >
              <img
                src={IMAGES[i]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/45 to-ink-950/10 transition-colors group-hover:from-ink-950/98" />

              <div className="relative flex h-full flex-col justify-between p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-3xl font-bold text-cream-50/90 sm:text-4xl">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 backdrop-blur-sm transition-colors group-hover:bg-forest-500">
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 font-serif text-lg font-medium text-cream-50 sm:text-2xl">
                    {pillar.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-cream-200/80 text-pretty sm:text-sm">
                    {pillar.description}
                  </p>
                </div>
              </div>
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
