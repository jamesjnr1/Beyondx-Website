import { ClipboardList, FileCheck2, MapPin, Wallet } from 'lucide-react'
import { steps } from '../data'
import { Reveal, container, h2, sectionY } from './site/ui'

const icons = [ClipboardList, FileCheck2, MapPin, Wallet]

/** How it works: four steps on one connecting timeline. */
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

        {/* A timeline: each step's icon sits on one connecting track (across on
            desktop, down the left on phones), with a large number, title and text. */}
        <ol className="relative mt-16 grid gap-12 lg:grid-cols-4 lg:gap-10">
          <span aria-hidden="true" className="absolute left-7 top-14 bottom-14 w-px bg-white/25 lg:hidden" />
          <span aria-hidden="true" className="absolute left-14 right-14 top-7 hidden h-px bg-white/25 lg:block" />
          {steps.map((step, i) => {
            const Icon = icons[i] ?? ClipboardList
            return (
              <Reveal key={step.number} delay={i * 0.07}>
                <li className="relative flex gap-6 lg:block">
                  <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-forest-700 shadow-lg shadow-forest-900/20">
                    <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="lg:mt-7">
                    <p className="font-display text-4xl font-bold leading-none text-white/35">{step.number}</p>
                    <h3 className="mt-3 font-display text-xl font-semibold text-white">{step.title}</h3>
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
