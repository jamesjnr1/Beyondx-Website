import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'

const members = [
  { initials: 'SA', name: 'Spencer Amoo-Yankey', role: 'Chief Executive Officer' },
  { initials: 'JD', name: 'Jonathan James Duah', role: 'Chief Technical Officer' },
  { initials: 'ED', name: 'Edwina Dzifa Ashigbui', role: 'Chief Marketing Officer' },
  { initials: 'EN', name: 'Elikem Ama Nyaho', role: 'Chief Finance Officer' },
  { initials: 'AO', name: 'Abigail Aseda Osei', role: 'Finance Team Member' },
  { initials: 'JA', name: 'Jessica Joelynn Abdul', role: 'Finance Team Member' },
  { initials: 'NY', name: 'Nana Yaw Kra Mensah', role: 'Sales Team Member' },
  { initials: 'CK', name: 'Canny Eyram Kataria', role: 'Sales Team Member' },
  { initials: 'WA', name: 'Windin Azera', role: 'Product Development Member' },
  { initials: 'KA', name: 'Kwame Appiah Owiredu-Akoto', role: 'Product Development Member' },
  { initials: 'EE', name: 'Elim Essikpe', role: 'Marketing Team Member' },
]

export default function Team() {
  const { ref, visible } = useReveal()

  return (
    <section id="team" ref={ref} className="relative overflow-hidden bg-cream-100 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            The team
          </span>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            Meet the{' '}
            <span className="italic gradient-text">Team</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-700 text-pretty">
            BeyondX was designed and built by eleven students at Ashesi University,
            driven by the belief that technology can be a genuine force for justice
            and second chances.
          </p>
          <p className="mt-3 text-sm font-medium uppercase tracking-wide text-ink-700/70">
            Team Rainbow · 11 Members · Foundation of Design Thinking &amp; Entrepreneurship
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 + (i % 4) * 0.06 }}
              className="flex flex-col items-center gap-2 rounded-xl bg-cream-50 p-4 text-center shadow-sm ring-1 ring-ink-900/5 sm:flex-row sm:gap-3 sm:text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-cream-50">
                {m.initials}
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-[15px] font-medium leading-snug text-ink-900 [overflow-wrap:anywhere] sm:text-base">{m.name}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-700">{m.role}</span>
              </span>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-ink-700/70">
          Ashesi University · Berekuso, Eastern Region, Ghana
        </p>
      </div>
    </section>
  )
}
