import { motion } from 'framer-motion'
import { UserX, AlertTriangle, ShieldAlert, CalendarX, RefreshCw, Users } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'

const problems = [
  {
    icon: UserX,
    title: 'No-shows',
    description: 'A worker agrees to a job, then never arrives — and you find out when the job was supposed to start.',
  },
  {
    icon: AlertTriangle,
    title: 'Poor quality',
    description: 'The work gets done, but not to a standard you can rely on, and there is no record to hold anyone to.',
  },
  {
    icon: ShieldAlert,
    title: 'Unverified skills',
    description: '"I can do the job" is easy to say. Without verification, you have no way to know if it is true.',
  },
  {
    icon: CalendarX,
    title: 'Last-minute cancellations',
    description: 'Plans fall through with no notice, leaving you to scramble right when you needed things to go smoothly.',
  },
  {
    icon: RefreshCw,
    title: 'Finding replacements',
    description: 'When someone falls through, starting the search over again costs time you did not have to spare.',
  },
  {
    icon: Users,
    title: 'Unreliable referrals',
    description: 'A friend-of-a-friend recommendation is only as good as the last job they happened to do well.',
  },
]

export default function ProblemSection() {
  const { ref, visible } = useReveal()

  return (
    <section ref={ref} className="relative bg-cream-50 py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            The problem with informal hiring
          </span>
          <h2 className="font-serif text-2xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            Finding someone is not always the hard part.{' '}
            <span className="italic gradient-text">Knowing they will be the ideal person for you is.</span>
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {problems.map((problem, i) => {
            const Icon = problem.icon
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                animate={visible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-ink-900/8 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-clay-400/12">
                  <Icon size={18} className="text-clay-600" aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 font-serif text-lg font-semibold text-ink-900">
                  {problem.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-700/80">
                  {problem.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
