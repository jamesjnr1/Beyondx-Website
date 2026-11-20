import { UserX, AlertTriangle, ShieldAlert, CalendarX, RefreshCw, Users } from 'lucide-react'
import { Accent, Reveal, SectionHead, card, container, sectionY } from './site/ui'

const problems = [
  { icon: UserX, title: 'No-shows', description: 'Someone agrees to a job, then never arrives.' },
  { icon: AlertTriangle, title: 'Poor quality', description: 'The work is done, but not to a standard you can rely on.' },
  { icon: ShieldAlert, title: 'Unverified skills', description: '"I can do the job" is easy to say and hard to check.' },
  { icon: CalendarX, title: 'Last-minute cancellations', description: 'Plans fall through with no notice.' },
  { icon: RefreshCw, title: 'Finding replacements', description: 'Starting the search again costs time you do not have.' },
  { icon: Users, title: 'Unreliable informal referrals', description: 'A recommendation is only as good as the last job.' },
]

export default function ProblemSection() {
  return (
    <section className={`bg-cream-100 ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="The problem with informal hiring"
          title={<>Finding someone is not always the hard part. <Accent>Knowing they will be the ideal person for you is.</Accent></>}
          className="max-w-3xl"
        />
        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map(({ icon: Icon, title, description }, i) => (
            <li key={title}>
              <Reveal delay={(i % 3) * 0.06} className={`${card} flex h-full items-start gap-4 p-5`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-600/10 text-forest-800">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span>
                  <h3 className="text-base font-semibold text-ink-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700/80">{description}</p>
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
