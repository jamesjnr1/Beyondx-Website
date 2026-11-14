import { useState } from 'react'
import { Check } from 'lucide-react'
import { Accent, Reveal, SectionHead, card, container, sectionY } from './site/ui'

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

function NoticeCard({ label, heading, points }: { label: string; heading: string; points: string[] }) {
  return (
    <div className={`${card} h-full p-6 sm:p-8`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-800">{label}</p>
      <h3 className="mt-2 font-serif text-2xl font-medium text-ink-900">{heading}</h3>
      <ul className="mt-6 space-y-4">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
              <Check size={12} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="text-sm leading-relaxed text-ink-700">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Transparency() {
  const [audience, setAudience] = useState<'employer' | 'worker'>('employer')
  return (
    <section className={`bg-cream-100 ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="Our commitments"
          title={<>Transparency on <Accent>both sides</Accent></>}
          lead="BeyondX makes clear commitments to every employer and every Xpert on this platform."
        />

        {/* One card at a time on phones, both side by side from lg up */}
        <div className="mt-8 flex gap-2 lg:hidden">
          {(['employer', 'worker'] as const).map((a) => (
            <button key={a} onClick={() => setAudience(a)} aria-pressed={audience === a}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${audience === a ? 'bg-ink-900 text-cream-50' : 'bg-white text-ink-700 ring-1 ring-ink-900/10'}`}>
              {a === 'employer' ? 'For Employers' : 'For Xperts'}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:mt-14 lg:grid-cols-2">
          <Reveal className={audience === 'employer' ? 'block' : 'hidden lg:block'}>
            <NoticeCard label="For Employers" heading="Our Verification Standard" points={employerPoints} />
          </Reveal>
          <Reveal delay={0.08} className={audience === 'worker' ? 'block' : 'hidden lg:block'}>
            <NoticeCard label="For Xperts" heading="Welcome. You Belong Here." points={workerPoints} />
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mt-5 rounded-2xl border border-forest-600/25 bg-forest-600/[0.07] p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-ink-800 text-pretty">
            <span className="font-semibold text-forest-800">Important:</span> Every
            Xpert on this platform is individually vetted by our team before being
            assigned. Verification confirms identity and work-readiness. All Xperts
            are held to the same standard of conduct and fairness.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
