import { steps } from '../data'
import { Accent, Reveal, SectionHead, container, sectionY } from './site/ui'

export default function HowItWorks() {
  return (
    <section id="how" className={`bg-cream-100 ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="How BeyondX works"
          title={<>From request to payment in <Accent>four steps</Accent></>}
          lead="You describe the work. We quote it, send the right Xpert, and stay on the job with you until it is done."
        />
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.number}>
              <Reveal delay={i * 0.07}>
                <div className="flex items-center gap-4">
                  <span className="font-serif text-5xl font-medium leading-none text-forest-700">{step.number}</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-ink-900/15" />
                </div>
                <h3 className="mt-5 font-serif text-xl font-medium leading-snug text-ink-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700/80">{step.description}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
