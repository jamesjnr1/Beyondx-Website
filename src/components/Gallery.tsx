import { Images } from 'lucide-react'
import { Reveal, container } from './site/ui'

export default function Gallery() {
  return (
    <section id="gallery" className="bg-white py-14 sm:py-20">
      <div className={container}>
        <Reveal className="flex flex-col items-center rounded-3xl border border-dashed border-ink-900/15 bg-cream-100 px-6 py-16 text-center sm:py-24">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-600/10 text-forest-800">
            <Images size={28} aria-hidden="true" />
          </span>
          <h2 className="mt-5 font-serif text-3xl font-medium text-ink-900">Coming soon</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-700/80 text-pretty sm:text-lg">
            We're putting together a look at BeyondX Xperts on the job, events, and
            moments from the programme. Check back soon.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
