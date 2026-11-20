import { Chip, Reveal, container, sectionY } from './site/ui'

/** The CEO's message, on its own. */
export default function Testimonial() {
  return (
    <section className={`bg-cream-50 ${sectionY}`}>
      <div className={container}>
        <Reveal className="mx-auto max-w-4xl text-center">
          <Chip>A message from our CEO</Chip>
          <blockquote className="mt-6 font-display text-2xl font-medium leading-snug text-ink-900 text-pretty sm:text-[1.875rem] sm:leading-[1.4]">
            &ldquo;BeyondX exists because hiring should not be a gamble. Every job
            completed on our platform builds a verified record of skill and
            reliability, so employers know who they can trust before the work
            begins, and skilled workers are recognised for what they can actually
            do.{' '}
            <span className="text-forest-700">Where skill meets tasks.</span>&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-base font-semibold text-cream-50">SA</div>
            <div className="text-left">
              <div className="font-semibold text-ink-900">Spencer Amoo-Yankey</div>
              <div className="text-sm text-ink-700/70">Chief Executive Officer, BeyondX</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
