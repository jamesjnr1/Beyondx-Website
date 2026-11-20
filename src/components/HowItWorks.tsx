import { steps } from '../data'
import { Reveal, SectionHead, container, sectionY } from './site/ui'

/** How it works: four numbered steps on soft cards. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className={`bg-white ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="How it works"
          title="A managed service, not a directory"
          lead="You never chase individual workers or negotiate in the dark. BeyondX owns the whole engagement, from your request to the settled payment."
        />

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.06} className="h-full">
              <li className="group h-full rounded-3xl border border-ink-900/10 bg-cream-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
                <span className="font-display text-5xl font-bold text-forest-600/25 transition-colors group-hover:text-forest-600/45">
                  {step.number}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-700/80">{step.description}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
