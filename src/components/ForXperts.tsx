import { BadgeCheck, ClipboardList, PhoneCall, TrendingUp, Wallet } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { Reveal, SectionHead, container, sectionY } from './site/ui'

const promises = [
  'This platform helps you build a verified record through honest work and fair pay.',
  'You have the right to fair pay, respectful treatment, and to report any employer who treats you unfairly.',
  'More completed jobs means a stronger profile and access to better opportunities.',
  'Your work speaks for you here.',
]

const path = [
  { icon: ClipboardList, title: 'Get verified', body: 'Sign up and complete the four checks: ID, guarantor, evidence of your work and a reference.' },
  { icon: PhoneCall, title: 'Get matched', body: 'BeyondX matches you to jobs across Greater Accra and manages each one from start to finish.' },
  { icon: Wallet, title: 'Get paid', body: 'When the employer confirms the job is done, you are paid through secure mobile money.' },
  { icon: TrendingUp, title: 'Build your record', body: 'Every completed job and review adds to a verified work record that opens the next door.' },
]

/** For Xperts: what BeyondX promises them, and their path on the platform. */
export default function ForXperts() {
  const { open } = useAuth()
  return (
    <section id="xperts" className={`bg-white ${sectionY}`}>
      <div className={`${container} grid items-start gap-14 lg:grid-cols-2`}>
        <div>
          <SectionHead
            chip="For Xperts"
            title="Not a one-time placement. A pathway."
            lead="BeyondX is built for people ready to work. Your skills, your time and your willingness to work have value, and every job you complete is recorded."
          />
          <ul className="mt-8 space-y-4">
            {promises.map((p, i) => (
              <Reveal key={p} delay={i * 0.05}>
                <li className="flex gap-3">
                  <BadgeCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-600" />
                  <p className="leading-relaxed text-ink-700">{p}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className="lg:mt-12">
          <div className="rounded-3xl bg-forest-900 p-8 text-cream-50 sm:p-10">
            <h3 className="font-display text-2xl font-bold">Your path on BeyondX</h3>
            <ol className="mt-8 space-y-7">
              {path.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex gap-4">
                  <Icon size={24} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-300" />
                  <div>
                    <p className="font-semibold"><span className="mr-2 text-forest-300">{i + 1}.</span>{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-cream-100/70">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => open('worker-login')}
              className="mt-9 inline-block rounded-full bg-forest-500 px-6 py-3 font-semibold text-ink-900 transition-all hover:-translate-y-0.5 hover:bg-forest-400 hover:shadow-lg"
            >
              Sign up to be an Xpert
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
