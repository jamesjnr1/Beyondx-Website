import Team from '../components/Team'
import { Accent, PageHero, Reveal, SectionHead, container, sectionY } from '../components/site/ui'
import { pillars } from '../data'

/** About: who BeyondX is, why it exists, what it stands for, and the team. */
export default function TeamPage() {
  return (
    <>
      <PageHero
        chip="About us"
        title={<>Where work <Accent>meets skill</Accent></>}
        lead="BeyondX is a managed labour service for Greater Accra. You tell us the job; we select, verify and manage the right Xpert, and every completed job builds a verified record of skill and reliability."
      />

      {/* Our story */}
      <section className={`bg-white ${sectionY}`}>
        <div className={`${container} grid items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
          <div>
            <SectionHead chip="Our story" title="Hiring should not be a gamble" />
            <Reveal className="mt-6 space-y-4 text-base leading-relaxed text-ink-700/85 sm:text-lg">
              <p>
                In Accra, finding short-term help still runs on word of mouth. A small business that needs
                two extra hands for a clean-up, an event or a move has no reliable channel beyond asking
                around, while skilled, willing workers have no structured way to reach the employers who
                need them.
              </p>
              <p>
                Trust is the real barrier, so that is what we built for. Every Xpert is checked before they
                are approved, every job starts with one firm quote, attendance is GPS-verified, and payment
                is handled through BeyondX.
              </p>
              <p>
                BeyondX began at Ashesi University in the Foundations of Design Thinking &amp; Entrepreneurship
                course. Our first job, a deep clean at HealthPlan Facility in Ashaiman, ran long as the scope
                grew. The team stayed until it was done, the client said they would use us again, and the
                Xperts were paid in full.
              </p>
            </Reveal>
          </div>
          <Reveal className="rounded-3xl bg-forest-50 p-5 sm:p-8">
            <img src="/about.jpg" alt="BeyondX Xperts at work on a site in Greater Accra"
              className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
          </Reveal>
        </div>
      </section>

      {/* What we stand for: the heading holds its place on the left while the
          three promises read down the right, each led by a large number. */}
      <section className={`bg-forest-50 ${sectionY}`}>
        <div className={`${container} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`}>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHead
              chip="What we stand for"
              title="Three promises behind every job"
              lead="They shape how we vet, match and pay, and they hold for employers and Xperts alike."
            />
          </div>
          <ol className="space-y-12">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <li className="grid grid-cols-[3.75rem_1fr] gap-x-4 sm:grid-cols-[5rem_1fr] sm:gap-x-6">
                  <span className="font-display text-5xl font-bold leading-none text-forest-600 sm:text-6xl">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="pt-1">
                    <h3 className="font-display text-2xl font-semibold text-ink-900">{p.title}</h3>
                    <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-700/85 sm:text-lg">{p.description}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <Team />
    </>
  )
}
