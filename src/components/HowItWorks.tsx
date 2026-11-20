import { ClipboardList, FileCheck2, MapPin, Wallet } from 'lucide-react'
import { steps } from '../data'
import { Reveal, SectionHead, container, sectionY } from './site/ui'

const icons = [ClipboardList, FileCheck2, MapPin, Wallet]

/** How it works: four numbered steps, each with a plain icon. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className={`bg-white ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="How it works"
          title="A managed service, not a directory"
          lead="You never chase individual workers or negotiate in the dark. BeyondX owns the whole engagement, from your request to the settled payment."
        />

        <ol className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = icons[i] ?? ClipboardList
            return (
              <Reveal key={step.number} delay={i * 0.06}>
                <li>
                  <div className="flex items-center gap-3">
                    <Icon size={30} strokeWidth={1.75} aria-hidden="true" className="text-forest-600" />
                    <span className="font-display text-sm font-semibold tracking-wider text-ink-700/50">{step.number}</span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-ink-900">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-700/80">{step.description}</p>
                </li>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
