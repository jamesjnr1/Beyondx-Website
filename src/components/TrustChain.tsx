import { ShieldCheck, UserCheck, Hammer, Star, TrendingUp, ChevronRight } from 'lucide-react'
import { Accent, Reveal, SectionHead, container, sectionY } from './site/ui'

const chain = [
  { icon: ShieldCheck, label: 'Verified' },
  { icon: UserCheck, label: 'Assigned' },
  { icon: Hammer, label: 'Performs' },
  { icon: Star, label: 'Reviewed' },
  { icon: TrendingUp, label: 'Performance record updated' },
]

export default function TrustChain() {
  return (
    <section className={`bg-cream-100 ${sectionY}`}>
      <div className={container}>
        <SectionHead
          center
          chip="How we build trust"
          title={<>How BeyondX <Accent>verifies Xperts</Accent></>}
          lead="We do not just ask whether someone says they can do the job. We verify their information and build a record of their performance over time."
        />
        <Reveal delay={0.1}>
          <ol className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-5 sm:gap-0">
            {chain.map(({ icon: Icon, label }, i) => (
              <li key={label} className="relative flex items-center gap-4 rounded-2xl border border-ink-900/10 bg-white p-4 sm:flex-col sm:gap-0 sm:rounded-none sm:border-0 sm:p-0 sm:text-center">
                {i < chain.length - 1 && (
                  <ChevronRight size={18} aria-hidden="true" className="absolute right-[-9px] top-6 hidden text-ink-900/25 sm:block" />
                )}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="sm:mt-4 sm:px-3">
                  <span className="block text-xs font-semibold tracking-[0.12em] text-ink-700/50">STEP {i + 1}</span>
                  <span className="mt-0.5 block text-base font-semibold text-ink-900">{label}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
