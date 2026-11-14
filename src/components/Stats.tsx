import { stats } from '../data'
import { Reveal, container } from './site/ui'

export default function Stats() {
  return (
    <section aria-label="BeyondX at a glance" className="bg-white pb-16 sm:pb-24">
      <div className={container}>
        <Reveal>
          <ul className="grid grid-cols-2 border-y border-ink-900/15 lg:grid-cols-4 lg:divide-x lg:divide-ink-900/10">
            {stats.map((stat, i) => (
              <li key={stat.label} className={`py-8 pr-4 sm:py-10 lg:px-8 ${i === 0 ? 'lg:pl-0' : ''} ${i > 1 ? 'border-t border-ink-900/10 lg:border-t-0' : ''}`}>
                <p className="font-serif text-5xl font-medium leading-none tracking-[-0.02em] text-ink-900 sm:text-6xl">{stat.value}</p>
                <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-ink-700/75">{stat.label}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
