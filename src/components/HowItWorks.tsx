import { ClipboardList, FileCheck2, MapPin, Wallet } from 'lucide-react'
import { steps } from '../data'
import { Reveal, container, h2, sectionY } from './site/ui'

const icons = [ClipboardList, FileCheck2, MapPin, Wallet]

/** How it works: four steps in two aligned columns, a plain icon beside each. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className={`bg-gradient-to-br from-forest-600 via-forest-700 to-forest-800 text-white ${sectionY}`}>
      <div className={container}>
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-widest text-white/80">How it works</span>
          <h2 className={`${h2} mt-3 text-white`}>A managed service, not a directory</h2>
          <p className="mt-4 text-base leading-relaxed text-white/85 text-pretty sm:text-lg">
            You never chase individual workers or negotiate in the dark. BeyondX owns the whole engagement, from your request to the settled payment.
          </p>
        </Reveal>

        <ol className="mt-14 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {steps.map((step, i) => {
            const Icon = icons[i] ?? ClipboardList
            return (
              <Reveal key={step.number} delay={(i % 2) * 0.06}>
                <li className="flex gap-5">
                  <Icon size={32} strokeWidth={1.6} aria-hidden="true" className="mt-1 shrink-0 text-white" />
                  <div className="max-w-md">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Step {step.number}</p>
                    <h3 className="mt-1.5 font-display text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-2.5 leading-relaxed text-white/85">{step.description}</p>
                  </div>
                </li>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
