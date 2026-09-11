import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useAuth } from './auth/AuthContext'

export default function ImpactBanner() {
  const { ref, visible } = useReveal()
  const { open } = useAuth()

  return (
    <section ref={ref} className="relative">
      <div className="grid overflow-hidden lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 1.06 }}
          animate={visible ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.9 }}
          className="relative h-[280px] sm:h-[380px] lg:h-[480px]"
        >
          <img
            src="/about.jpg"
            alt="BeyondX workers on a job site"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative flex flex-col justify-center bg-forest-700 px-6 py-12 grain sm:px-12 sm:py-16 lg:px-14"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-300 sm:mb-5">
            Our impact
          </span>
          <h2 className="font-serif text-3xl font-medium leading-[1.1] text-cream-50 sm:text-5xl lg:text-6xl">
            Restoring
            <br />
            dignity
            <br />
            <span className="italic text-clay-300">through work.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-cream-200/80 text-pretty sm:text-lg">
            A record should mark where someone has been, not where they're
            stuck. Every job completed on BeyondX builds proof of skill and
            reliability that outlasts it.
          </p>
          <button
            onClick={() => open('worker-login')}
            className="group mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-cream-50 px-6 py-3 text-sm font-semibold text-forest-700 transition-all hover:bg-cream-100 active:scale-[0.98]"
          >
            Find work
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
