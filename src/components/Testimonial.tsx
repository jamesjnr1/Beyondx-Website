import { Quote } from 'lucide-react'
import { Chip, Reveal, container, sectionY } from './site/ui'

export default function Testimonial() {
  return (
    <section className={`bg-white ${sectionY}`}>
      <div className={container}>
        <Reveal className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Quote size={26} aria-hidden="true" className="text-forest-600" />
            <Chip>A message from our CEO</Chip>
          </div>
          <blockquote className="mt-6 font-serif text-2xl font-medium leading-snug text-ink-900 text-pretty sm:text-3xl sm:leading-[1.3]">
            &ldquo;BeyondX exists because hiring should not be a gamble. Every job
            completed on our platform builds a verified record of skill and
            reliability, so employers know who they can trust before the work
            begins, and skilled workers are recognised for what they can actually
            do.{' '}
            <span className="italic text-forest-700">Where skill meets tasks.</span>&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-3.5 border-t border-ink-900/10 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[9999px] bg-ink-900 text-base font-semibold text-cream-50">SA</div>
            <div>
              <div className="font-semibold text-ink-900">Spencer Amoo-Yankey</div>
              <div className="text-sm text-ink-700/70">Chief Executive Officer, BeyondX</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
