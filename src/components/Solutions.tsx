import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'

const tiles = [
  {
    image: '/hero.jpg',
    title: 'Skill-Matched Dispatch, Verified In Minutes',
    body: 'Post a task or pick a worker by category — BeyondX confirms the skill match and gets someone moving the same day.',
    big: true,
  },
  {
    image: '/categories/electrical.jpg',
    title: 'Guarantor-Backed Vetting',
    body: 'Every worker is cleared through our own guarantor verification before they ever appear on the platform.',
  },
  {
    image: '/categories/landscaping.jpg',
    title: 'GPS-Verified Attendance',
    body: 'Real-time check-in confirms who is on site, and when — for every job, every time.',
  },
]

function Tile({ image, title, body, big, delay }: { image: string; title: string; body: string; big?: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay }}
      className={`img-zoom group relative overflow-hidden rounded-2xl ${big ? 'aspect-[4/3] lg:aspect-auto lg:h-full' : 'aspect-[16/10]'}`}
    >
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
      <div className={`relative flex h-full flex-col justify-end p-5 sm:p-6 ${big ? 'lg:p-8' : ''}`}>
        <h3 className={`font-serif font-medium leading-snug text-cream-50 text-balance ${big ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg'}`}>
          {title}
        </h3>
        <p className={`mt-2 max-w-sm text-cream-200/85 text-pretty ${big ? 'text-sm sm:text-base' : 'text-sm'}`}>
          {body}
        </p>
        <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-cream-50/15 p-2 text-cream-50 backdrop-blur-sm transition-colors group-hover:bg-cream-50/25">
          <ArrowUpRight size={16} aria-hidden="true" />
        </span>
      </div>
    </motion.div>
  )
}

export default function Solutions() {
  const { ref, visible } = useReveal()
  const [big, ...rest] = tiles

  return (
    <section ref={ref} className="relative bg-cream-100 py-14 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500 sm:mb-4">
            Practical, verified solutions
          </span>
          <h2 className="font-serif text-2xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            Built for how work{' '}
            <span className="italic gradient-text">actually happens</span>
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-5 lg:gap-6">
          <div className="lg:col-span-3">
            <Tile {...big} delay={0} />
          </div>
          <div className="flex flex-col gap-4 sm:gap-5 lg:col-span-2 lg:gap-6">
            {rest.map((t, i) => (
              <Tile key={t.title} {...t} delay={(i + 1) * 0.12} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
