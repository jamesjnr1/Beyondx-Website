import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { stats } from '../data'

export default function Stats() {
  const { ref, visible } = useReveal()

  return (
    <section ref={ref} className="relative bg-forest-700 py-16 grain">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="font-serif text-4xl font-bold text-cream-50 sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-cream-200/80">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
