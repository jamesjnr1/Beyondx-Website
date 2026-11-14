import { Accent, Reveal, SectionHead, container, sectionY } from './site/ui'

const problems = [
  { title: 'No-shows', description: 'Someone agrees to a job, then never arrives — and you find out when the job was supposed to start.' },
  { title: 'Poor quality', description: 'The work gets done, but not to a standard you can rely on, and there is no record to hold anyone to.' },
  { title: 'Unverified skills', description: '"I can do the job" is easy to say. Without verification, you have no way to know if it is true.' },
  { title: 'Last-minute cancellations', description: 'Plans fall through with no notice, leaving you to scramble right when you needed things to go smoothly.' },
  { title: 'Finding replacements', description: 'When someone falls through, starting the search over again costs time you did not have to spare.' },
  { title: 'Unreliable informal referrals', description: 'A friend-of-a-friend recommendation is only as good as the last job they happened to do well.' },
]

export default function ProblemSection() {
  return (
    <section className={`bg-white ${sectionY}`}>
      <div className={`${container} grid gap-10 lg:grid-cols-[0.9fr_1.3fr] lg:gap-20`}>
        <SectionHead
          chip="The problem with informal hiring"
          title={<>Finding someone is not always the hard part. <Accent>Knowing they will be the ideal person for you is.</Accent></>}
          lead="These are the problems employers told us about. BeyondX is built to take each one off your hands."
          className="lg:sticky lg:top-28 lg:self-start"
        />
        <Reveal delay={0.08}>
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {problems.map(({ title, description }, i) => (
              <li key={title} className="border-t border-ink-900/15 py-6">
                <span className="font-serif text-sm italic text-forest-700">0{i + 1}</span>
                <h3 className="mt-2 font-serif text-xl font-medium text-ink-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700/80">{description}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
