import { MoveHorizontal } from 'lucide-react'
import { pillars } from '../data'
import { Accent, Reveal, SectionHead, container, sectionY } from './site/ui'

export default function Pillars() {
  return (
    <section id="principles" className={`bg-gradient-to-br from-forest-800 to-forest-900 ${sectionY}`}>
      <div className={container}>
        <SectionHead dark chip="Our principles" title={<>Built on <Accent dark>three pillars</Accent></>} />

        {/* A swipe row on phones keeps all three within the height of one card; a grid from tablet up */}
        <div className="mt-10 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 0.08} className="w-[80%] shrink-0 snap-center rounded-2xl border border-white/15 bg-white/[0.06] p-6 sm:w-auto sm:shrink sm:p-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">{i + 1}</span>
              <h3 className="mt-5 text-xl font-semibold text-white">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/80 text-pretty">{pillar.description}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-cream-100 sm:hidden">
          <MoveHorizontal size={14} aria-hidden="true" className="text-forest-400" /> Swipe to see all three
        </p>
      </div>
    </section>
  )
}
