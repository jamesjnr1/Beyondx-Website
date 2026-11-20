import { stats } from '../data'
import { Reveal, container } from './site/ui'

/** The figures, in one contained green band. */
export default function Stats() {
  return (
    <section aria-label="BeyondX at a glance" className="bg-white pt-16 sm:pt-24">
      <div className={container}>
        <Reveal className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-forest-800 to-forest-900 text-white">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10">
            {[260, 380, 500].map((s) => (
              <span key={s} className="absolute right-0 top-0 rounded-full border border-white/10" style={{ width: s, height: s, transform: `translate(${(s - 260) / 2}px, -${(s - 260) / 2}px)` }} />
            ))}
          </div>
          <ul className="grid grid-cols-2 text-center lg:grid-cols-4 lg:divide-x lg:divide-white/15">
            {stats.map((stat) => (
              <li key={stat.label} className="px-5 py-8 sm:py-12">
                <p className="font-serif text-5xl font-medium leading-none sm:text-6xl">{stat.value}</p>
                <p className="mx-auto mt-3 max-w-[22ch] text-sm leading-relaxed text-white/80">{stat.label}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
