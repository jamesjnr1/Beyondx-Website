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
    <section id="team" ref={ref} className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-700/60">
          Team Rainbow · 11 Members · Foundation of Design Thinking &amp; Entrepreneurship
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 + (i % 4) * 0.06 }}
              className="flex items-center gap-4 rounded-2xl border border-ink-900/10 bg-white p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-cream-50">
                {m.initials}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-snug text-ink-900 [overflow-wrap:anywhere]">{m.name}</span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-700/75">{m.role}</span>
              </span>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 border-t border-ink-900/10 pt-6 text-sm text-ink-700/70">
          Ashesi University · Berekuso, Eastern Region, Ghana
        </p>
      </div>
    </section>
  )
}
