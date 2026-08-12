import { motion } from 'framer-motion'
import { Image } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'

export default function Gallery() {
  const { ref, visible } = useReveal()

  return (
    <section id="gallery" ref={ref} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            Gallery
          </span>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-600/10">
            <Image size={30} aria-hidden="true" className="text-forest-600" />
          </div>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            Coming{' '}
            <span className="italic gradient-text">soon</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-700 text-pretty">
            We're putting together a look at BeyondX workers on the job, events, and
            moments from the programme. Check back soon.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
