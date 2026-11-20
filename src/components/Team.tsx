import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'

/** Photos are in /public/team, named after each person (from the team's Canva deck). */
const photo = (name: string) => `/team/${name.toLowerCase().replace(/[^a-z]+/g, '-')}.jpg`

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
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-forest-700">
          Team Rainbow · 11 Members · Foundation of Design Thinking &amp; Entrepreneurship
        </p>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 + (i % 4) * 0.06 }}
              className="flex flex-col items-center text-center"
            >
              <img
                src={photo(m.name)}
                alt={m.name}
                loading="lazy"
                decoding="async"
                className="h-28 w-28 rounded-full object-cover ring-4 ring-forest-600/15 sm:h-32 sm:w-32"
              />
              <span className="mt-4 min-w-0">
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
