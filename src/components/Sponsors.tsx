import { MoveHorizontal } from 'lucide-react'
import { Accent, Reveal, SectionHead, card, container, sectionY } from './site/ui'

const tiers = [
  { name: 'Seed Sponsor', amount: 'GHS 800', description: 'Fund the certification of one Xpert — tools, training, and orientation.' },
  { name: 'Growth Partner', amount: 'Cohort of 5', description: 'Sponsor a cohort of five Xperts. Named co-branding and a quarterly impact report.' },
  { name: 'Anchor Partner', amount: 'Co-ownership', description: 'Full programme co-ownership with board observer seat and national PR partnership.' },
]

export default function Sponsors() {
  return (
    <section id="sponsors" className={`bg-cream-100 ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="For sponsors & partners"
          title={<>Join the <Accent>movement</Accent></>}
          lead="BeyondX runs on belief — belief that everyone willing to work deserves a fair shot, and a record that tracks what they’ve built, not what’s held them back."
        />
        <div className="mt-10 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08} className={`${card} flex w-[80%] shrink-0 snap-center flex-col p-6 transition-colors hover:border-forest-600/40 sm:w-auto sm:shrink sm:p-8`}>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-800">{t.name}</span>
              <span className="mt-3 text-2xl font-semibold text-ink-900">{t.amount}</span>
              <p className="mt-4 text-sm leading-relaxed text-ink-700/80">{t.description}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-ink-800 sm:hidden">
          <MoveHorizontal size={14} aria-hidden="true" className="text-forest-600" /> Swipe to see all tiers
        </p>
      </div>
    </section>
  )
}
