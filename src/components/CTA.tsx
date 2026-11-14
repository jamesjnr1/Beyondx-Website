import { ArrowRight } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { Reveal, container } from './site/ui'

/** Closing call to action: one full-width deep-green band, straight above the footer. */
export default function CTA() {
  const { open } = useAuth()
  return (
    <section id="cta" className="relative isolate overflow-hidden bg-gradient-to-br from-forest-800 to-forest-900 text-cream-50">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10">
        {[260, 380, 500].map((s) => (
          <span key={s} className="absolute right-0 top-0 rounded-full border border-cream-50/10" style={{ width: s, height: s, transform: `translate(${(s - 260) / 2}px, -${(s - 260) / 2}px)` }} />
        ))}
      </div>
      <div className={`${container} grid items-center gap-8 py-16 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:gap-16`}>
        <Reveal>
          <h2 className="font-serif text-4xl font-medium leading-[1.08] tracking-[-0.015em] text-balance sm:text-5xl sm:leading-[1.08]">
            Ready to <span className="italic text-forest-300">hire with purpose?</span>
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-cream-100/80 text-pretty">
            Join employers across Ghana building better businesses — and better futures — through BeyondX.
          </p>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <button type="button" onClick={() => open('employer-login')}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-cream-50 px-7 py-3.5 text-base font-semibold text-forest-900 transition-all hover:bg-white active:scale-[0.98]">
              Hire an Xpert
              <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => open('worker-login')}
              className="inline-flex items-center justify-center rounded-full border border-cream-50/35 px-7 py-3.5 text-base font-semibold text-cream-50 transition-colors hover:bg-cream-50/10">
              Sign up to be an Xpert
            </button>
          </div>
          <p className="text-sm text-cream-100/70">
            Already have an account?{' '}
            <button type="button" onClick={() => open('worker-login')} className="font-medium text-cream-50 underline underline-offset-4 hover:no-underline">Sign in</button>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
