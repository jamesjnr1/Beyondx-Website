import { useState } from 'react'
import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { CircleCheck as CheckCircle } from 'lucide-react'

const employerPoints = [
  'Every candidate is individually assessed and vetted for work-readiness before being listed',
  'You are hiring a vetted, work-ready individual assessed as fit for employment',
  'All job completions are tracked and recorded through the platform',
  'Our support team is available if any issue arises during a task',
]

const workerPoints = [
  'This platform helps you build a verified record through honest work and fair pay',
  'You have the right to fair pay, respectful treatment, and to report any employer who treats you unfairly',
  'More completed jobs means a stronger profile and access to better opportunities',
  'Your work speaks for you here.',
]

function NoticeCard({
  audience,
  heading,
  points,
  dotColor,
}: {
  audience: 'employer' | 'worker'
  heading: string
  points: string[]
  dotColor: string
}) {
  return (
    <div className="h-full rounded-2xl border border-ink-900/8 bg-cream-50 p-5 shadow-sm sm:p-8">
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink-900 sm:mb-6 sm:text-xl">
        {audience === 'employer' ? 'For Employers' : 'For Workers'}
      </h3>
      <p className="mb-4 text-sm font-medium text-ink-700 sm:-mt-4 sm:mb-5">{heading}</p>
      <ul className="space-y-3 sm:space-y-4">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <CheckCircle size={18} className={`mt-0.5 shrink-0 ${dotColor} sm:size-5`} />
            <span className="text-sm leading-relaxed text-ink-700">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Transparency() {
  const { ref, visible } = useReveal()
  const [audience, setAudience] = useState<'employer' | 'worker'>('employer')

  return (
    <section ref={ref} className="relative overflow-hidden bg-cream-100 py-14 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500 sm:mb-4">
            Our Commitments
          </span>
          <h2 className="font-serif text-2xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            Transparency on{' '}
            <span className="italic gradient-text">both sides.</span>
          </h2>
          <p className="mt-3 text-base text-ink-700 text-pretty sm:mt-4 sm:text-lg">
            BeyondX makes clear commitments to every employer and every worker on this platform.
          </p>
        </div>

        {/* Both cards carry four bullet points each — full length on a phone.
            A toggle shows one at a time on mobile (same pattern used in the
            employer dashboard's field/remote switch), and both sit side by
            side from `lg:` up where there's room. */}
        <div className="mt-6 flex justify-center gap-2 lg:hidden">
          {(['employer', 'worker'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                audience === a
                  ? 'bg-ink-900 text-cream-50'
                  : 'bg-ink-900/5 text-ink-700 hover:bg-ink-900/10'
              }`}
            >
              {a === 'employer' ? 'For Employers' : 'For Workers'}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-6 sm:mt-8 lg:mt-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className={audience === 'employer' ? 'block' : 'hidden lg:block'}
          >
            <NoticeCard
              audience="employer"
              heading="Our Verification Standard"
              points={employerPoints}
              dotColor="text-forest-600"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className={audience === 'worker' ? 'block' : 'hidden lg:block'}
          >
            <NoticeCard
              audience="worker"
              heading="Welcome. You Belong Here."
              points={workerPoints}
              dotColor="text-clay-500"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-6 max-w-3xl rounded-xl border border-clay-400/30 bg-clay-400/8 p-4 text-center sm:mt-10 sm:p-5"
        >
          <p className="text-xs leading-relaxed text-ink-700 text-pretty sm:text-sm">
            <span className="font-semibold text-clay-600">Important:</span> Every
            worker on this platform is individually vetted by our team before being
            listed. Verification confirms identity and work-readiness. All workers
            are held to the same standard of conduct and fairness.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
