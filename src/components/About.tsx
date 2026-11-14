import { Check } from 'lucide-react'
import { Accent, Reveal, SectionHead, container, sectionY } from './site/ui'

const points = [
  'Every Xpert is verified before they can take a job',
  'Each assignment adds to a work record',
  'Arrival and progress are logged for every job',
  'If anything comes up, BeyondX handles it',
]

export default function About() {
  return (
    <section id="about" className={`bg-white ${sectionY}`}>
      <div className={`${container} grid items-center gap-10 lg:grid-cols-2 lg:gap-16`}>
        <Reveal className="relative">
          <img src="/about.jpg" alt="Certified Xperts in safety harnesses on a construction site in Greater Accra"
            className="aspect-[4/3] w-full rounded-[2rem] object-cover" loading="lazy" />
        </Reveal>
        <div>
          <SectionHead
            chip="About BeyondX"
            title={<>Work that restores dignity. <Accent>Hire that builds trust.</Accent></>}
            lead="BeyondX is a managed labour service. You tell us what work you need done, and we find, verify and manage the right Xpert for it across Greater Accra — while tracking impact for Xperts rebuilding after setbacks as part of that mission."
          />
          <Reveal delay={0.1}>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
