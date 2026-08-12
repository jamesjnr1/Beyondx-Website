import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { stories } from '../data'
import { ArrowUpRight } from 'lucide-react'

export default function Stories() {
  const { ref, visible } = useReveal()

  return (
    <section id="stories" ref={ref} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-16 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
              Insights & events
            </span>
            <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
              Latest from{' '}
              <span className="italic gradient-text">BeyondX</span>
            </h2>
          </div>
          <a
            href="#"
            className="group inline-flex items-center gap-2 text-sm font-medium text-forest-600 transition-colors hover:text-forest-500"
          >
            View all
            <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {stories.map((story, i) => (
            <motion.article
              key={story.title}
              initial={{ opacity: 0, y: 30 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="img-zoom group cursor-pointer overflow-hidden rounded-2xl border border-ink-900/8 bg-cream-50"
            >
              <div className="relative overflow-hidden">
                <img
                  src={story.image}
                  alt={story.title}
                  className="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute left-4 top-4 rounded-full bg-cream-50/90 px-3 py-1 text-xs font-semibold text-ink-900 backdrop-blur-sm">
                  {story.tag}
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-serif text-lg font-medium leading-snug text-ink-900 text-balance transition-colors group-hover:text-forest-600">
                  {story.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700/80 text-pretty">
                  {story.excerpt}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-forest-600">
                  Read more
                  <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
