import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { Reveal, SectionHead, container, sectionY } from './site/ui'

const assurances: [string, string][] = [
  ['No sourcing hassle', 'BeyondX selects, confirms and manages the right Xpert for the job.'],
  ['One firm quote', 'You accept or decline one clear quote before anyone is dispatched. No haggling.'],
  ['Verified follow-through', 'Attendance is GPS-verified and every completed job is recorded.'],
]

const steps = [
  'Create your employer account',
  'Tell us the job, where and when',
  'Accept the quote and we send your Xpert',
]

/** Hire an Xpert: why it is easy on the left, the way in on the right. */
export default function CTA() {
  const { open } = useAuth()
  return (
    <section id="hire" className={`bg-cream-50 ${sectionY}`}>
      <div className={`${container} grid gap-12 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <SectionHead
            chip="Hire an Xpert"
            title="Tell us what work you need done"
            lead="Send a request and BeyondX reviews it, sends you one firm quote and confirms the right Xpert before anyone is dispatched."
          />
          <dl className="mt-10 space-y-6">
            {assurances.map(([term, desc]) => (
              <Reveal key={term}>
                <div className="border-l-2 border-forest-500 pl-5">
                  <dt className="font-semibold text-ink-900">{term}</dt>
                  <dd className="mt-1 text-ink-700/80">{desc}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>

        <Reveal className="self-center">
          <div className="rounded-3xl border border-ink-900/10 bg-white p-7 shadow-sm sm:p-10">
            <h3 className="font-display text-2xl font-bold text-ink-900">Ready to hire with purpose?</h3>
            <p className="mt-3 text-ink-700/80">
              Join employers across Ghana building better businesses, and better futures, through BeyondX.
            </p>
            <ol className="mt-7 space-y-3.5">
              {steps.map((s) => (
                <li key={s} className="flex items-center gap-3 text-ink-900">
                  <CheckCircle2 size={20} aria-hidden="true" className="shrink-0 text-forest-600" />
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => open('employer-login')}
                className="group inline-flex flex-1 whitespace-nowrap items-center justify-center gap-2 rounded-full bg-forest-700 px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-forest-800 hover:shadow-md"
              >
                Hire an Xpert
                <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => open('worker-login')}
                className="inline-flex flex-1 whitespace-nowrap items-center justify-center rounded-full border border-ink-900/15 px-6 py-3.5 font-semibold text-ink-900 transition-colors hover:border-ink-900/30 hover:bg-ink-900/5"
              >
                Sign up to be an Xpert
              </button>
            </div>
            <p className="mt-5 text-center text-sm text-ink-700/70">
              Already have an account?{' '}
              <button type="button" onClick={() => open('employer-login')} className="font-semibold text-forest-700 underline underline-offset-4 hover:no-underline">
                Sign in
              </button>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
