import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, Check, MapPin, RefreshCw, Users } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { container } from './site/ui'

const assurances = [
  { icon: BadgeCheck, title: 'Verified before any job', text: 'ID, guarantor, work evidence and reference' },
  { icon: Users, title: 'Selected by BeyondX', text: 'We match the right Xpert to your request' },
  { icon: MapPin, title: 'Attendance you can see', text: 'Arrival and progress logged on the job' },
  { icon: RefreshCw, title: 'Replacement arranged', text: 'If plans change, we handle it' },
]

const jobSteps = ['Request received', 'Quote accepted', 'Xpert confirmed']

export default function Hero() {
  const { open } = useAuth()
  return (
    <section id="top" className="relative overflow-hidden bg-cream-100">
      {/* A soft wash of the brand green behind the photo */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 h-[640px] w-[640px] rounded-full bg-forest-400/15 blur-[120px]" />

      <div className={`${container} relative grid items-center gap-12 pb-14 pt-28 sm:pt-36 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20 lg:pt-40`}>
        <div>
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <p className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-forest-800">
              <span aria-hidden="true" className="h-px w-8 bg-forest-600" />
              Managed labour · Greater Accra
            </p>
            <h1 className="mt-6 font-serif text-[2.75rem] font-medium leading-[1.04] tracking-[-0.02em] text-ink-900 text-balance sm:text-6xl sm:leading-[1.03] lg:text-[4.5rem] lg:leading-[1.02]">
              Reliable Xperts.
              <span className="block italic text-forest-700">Managed by BeyondX.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700 text-pretty">
              Need reliable Xperts for a task, shift or ongoing work? Tell us what
              you need. BeyondX handles the Xpert selection, coordination and
              follow through.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={() => open('employer-login')}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink-900 px-7 py-3.5 text-base font-semibold text-cream-50 transition-all hover:bg-ink-800 active:scale-[0.98]">
              Hire an Xpert
              <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => open('worker-login')}
              className="inline-flex items-center justify-center rounded-full border border-ink-900/20 bg-white/60 px-7 py-3.5 text-base font-semibold text-ink-900 transition-all hover:border-ink-900/40 hover:bg-white active:scale-[0.98]">
              Sign up to be an Xpert
            </button>
          </motion.div>
        </div>

        {/* The photo, with a small picture of how a job moves */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="overflow-hidden rounded-[2rem] bg-ink-900">
            <img src="/hero-mobile.jpg" alt="A BeyondX Xpert on a job site in Greater Accra" className="aspect-[4/5] w-full object-cover sm:aspect-[5/6]" loading="eager" />
          </div>

          <div className="absolute -left-3 bottom-8 w-60 rounded-2xl border border-ink-900/10 bg-white p-4 shadow-xl shadow-ink-900/10 sm:-left-8 sm:w-64" aria-hidden="true">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-700/60">Your request</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">Office cleaning · 2 Xperts</p>
            <ul className="mt-3 space-y-2">
              {jobSteps.map((s) => (
                <li key={s} className="flex items-center gap-2 text-xs text-ink-700">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={10} strokeWidth={3.5} /></span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="absolute -right-2 top-8 flex items-center gap-2.5 rounded-full border border-ink-900/10 bg-white py-2 pl-2 pr-4 shadow-lg shadow-ink-900/10 sm:-right-5" aria-hidden="true">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-white"><BadgeCheck size={17} /></span>
            <span className="text-xs font-semibold text-ink-900">Verified by BeyondX</span>
          </div>
        </motion.div>
      </div>

      {/* What every request comes with */}
      <div className="relative border-t border-ink-900/10 bg-white">
        <ul className={`${container} grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-ink-900/10`}>
          {assurances.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={`flex items-start gap-3 py-5 lg:py-7 ${i === 0 ? 'lg:pr-6' : 'lg:px-6'} ${i % 2 ? 'pl-3 lg:pl-6' : 'pr-3'}`}>
              <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-700" />
              <span>
                <span className="block text-sm font-semibold text-ink-900">{title}</span>
                <span className="mt-0.5 hidden text-xs leading-snug text-ink-700/70 sm:block">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
