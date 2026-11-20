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
      <div className={`${container} grid items-center gap-10 lg:grid-cols-2 lg:gap-20`}>
        <Reveal className="rounded-3xl bg-forest-600/10 p-5 sm:p-8">
          <img src="/about.jpg" alt="Certified Xperts in safety harnesses on a construction site in Greater Accra"
            className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
        </Reveal>
        <div>
          <SectionHead
            chip="What we do"
            title={<>Work that restores dignity. <Accent>Hire that builds trust.</Accent></>}
            lead="BeyondX is a managed labour service. You tell us what work you need done, and we find, verify and manage the right Xpert for it across Greater Accra."
          />
          <Reveal delay={0.1}>
            <ul className="mt-6 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-base text-ink-800">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
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
