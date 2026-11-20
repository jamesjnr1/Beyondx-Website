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

/** Trust & safety: the commitments on a dark band. */
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

        <div className="mt-14 grid gap-x-16 gap-y-12 sm:grid-cols-2">
          {commitments.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 2) * 0.06}>
              <div className="flex gap-5">
                <Icon size={32} strokeWidth={1.6} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-300" />
                <div className="max-w-md">
                  <h3 className="font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-2.5 leading-relaxed text-cream-100/70">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
