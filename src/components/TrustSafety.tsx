import { BadgeCheck, FileCheck, MapPin, Wallet } from 'lucide-react'
import { Reveal, SectionHead, container, sectionY } from './site/ui'

const commitments = [
  {
    icon: BadgeCheck,
    title: 'Vetted before approved',
    body: 'Every Xpert passes four checks before they can take a job: ID, guarantor, evidence of previous work and a reference.',
  },
  {
    icon: MapPin,
    title: 'GPS-verified attendance',
    body: 'Xperts check in at your site, so you get real-time confirmation of who arrived and when.',
  },
  {
    icon: FileCheck,
    title: 'A verified work record',
    body: 'Each completed job and review adds to the Xpert’s record: proof of skill and reliability that outlasts any single job.',
  },
  {
    icon: Wallet,
    title: 'Payments handled by BeyondX',
    body: 'One firm quote up front, then the Xpert is paid through secure mobile money once you confirm the job is done.',
  },
]

/** Trust & safety: the commitments on a dark band, closed by the CEO's message. */
export default function TrustSafety() {
  return (
    <section id="trust" className={`bg-ink-900 text-cream-50 ${sectionY}`}>
      <div className={container}>
        <SectionHead
          dark
          chip="Trust & safety"
          title="Trust you can verify, not just claim"
          lead="BeyondX makes clear commitments to every employer and every Xpert on the platform, and builds the systems to keep them."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {commitments.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 2) * 0.06} className="h-full">
              <div className="h-full rounded-3xl border border-cream-50/15 bg-cream-50/[0.04] p-8 transition-colors hover:border-forest-400/50">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-forest-600/20 text-forest-300">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-relaxed text-cream-100/70">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <figure className="mt-14 rounded-3xl border-l-4 border-forest-400 bg-cream-50/[0.04] p-8 sm:p-10">
            <blockquote className="font-display text-xl font-medium leading-relaxed sm:text-2xl sm:leading-relaxed">
              &ldquo;BeyondX exists because hiring should not be a gamble. Every job completed on our platform
              builds a verified record of skill and reliability, so employers know who they can trust before the
              work begins, and skilled workers are recognised for what they can actually do.{' '}
              <span className="text-forest-300">Where skill meets tasks.</span>&rdquo;
            </blockquote>
            <figcaption className="mt-5 text-sm text-cream-100/60">
              <span className="font-semibold text-cream-50">Spencer Amoo-Yankey</span>, Chief Executive Officer, BeyondX
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}
