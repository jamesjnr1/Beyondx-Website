import { motion } from 'framer-motion'
import { Newspaper } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'

export default function News() {
  const { ref, visible } = useReveal()
  return (
    <section id="news" ref={ref} className="relative bg-cream-100 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            News &amp; Events
          </span>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-600/10">
            <Newspaper size={30} aria-hidden="true" className="text-forest-600" />
          </div>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl">
            No live news{' '}
            <span className="italic gradient-text">yet</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-700 text-pretty">
            We don't have any live news or events to share just yet. As BeyondX grows,
            partnerships, milestones, and upcoming events will appear here.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
