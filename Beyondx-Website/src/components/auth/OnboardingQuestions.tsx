import { useEffect, useRef, useState } from 'react'
import { HeartHandshake, ChevronLeft } from 'lucide-react'
import { contact, session } from '../../lib/api'

export const WORKER_QUESTIONS = [
  'How did you hear about BeyondX?',
  'What made you decide to sign up?',
  'What kind of work do you do or are best at?',
  'Did you have any questions or concerns before joining?',
  'Do you use a smartphone, or mostly calls and SMS?',
  'What days and hours are you usually free to work?',
]

export const EMPLOYER_QUESTIONS = [
  'How did you hear about BeyondX?',
  'What made you consider trying the platform?',
  'What kind of tasks or roles are you looking to fill?',
  'Did you have any concerns or hesitations before reaching out?',
  'How often do you expect to need workers — one-off or ongoing?',
  'What would make you trust a new worker enough to hire them?',
]

const WELCOME =
  'Welcome to BeyondX! Thank you for signing up. We are still in our early stages, currently recruiting more workers and employers to the platform. It will take about two weeks before we have your first task ready to dispatch. We will keep you updated along the way and reach out as soon as a job matches your skills. Thanks for being one of our first members, we are glad to have you.'

type Props = {
  role: 'worker' | 'employer'
  onDone: () => void
}

export default function OnboardingQuestions({ role, onDone }: Props) {
  const questions = role === 'worker' ? WORKER_QUESTIONS : EMPLOYER_QUESTIONS
  // -1 is the welcome screen, then one screen per question.
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const worker = session.worker()
  const employer = session.employer()
  const name = role === 'worker'
    ? ((worker?.fullName as string) || (worker?.name as string) || '')
    : ((employer?.contactPerson as string) || (employer?.orgName as string) || '')
  const firstName = name.split(' ')[0] || 'there'

  useEffect(() => { if (step >= 0) inputRef.current?.focus() }, [step])

  const setAnswer = (v: string) => {
    setAnswers((a) => { const next = [...a]; next[step] = v; return next })
    if (error) setError(null)
  }

  const next = () => {
    if (!answers[step]?.trim()) { setError('Please answer before continuing.'); return }
    setError(null)
    setStep((s) => s + 1)
  }

  const finish = async () => {
    if (!answers[step]?.trim()) { setError('Please answer before finishing.'); return }
    if (sending) return
    setSending(true)
    setError(null)

    const message =
      `New ${role} onboarding via registration.\n\n--- Onboarding Answers ---\n` +
      questions.map((q, i) => `Q${i + 1}: ${q}\nA: ${answers[i] || '(no answer)'}`).join('\n\n')

    try {
      await contact.send({
        name,
        email: role === 'employer' ? (employer?.email as string) : undefined,
        phone: role === 'worker' ? (worker?.phone as string) : undefined,
        message,
        category: `${role}_onboarding`,
      })
    } catch {
      // Never trap someone out of their dashboard because a notification failed.
      // They are already registered; the answers are the only thing lost.
    } finally {
      setSending(false)
      onDone()
    }
  }

  /* ------------------------------ welcome ------------------------------ */
  if (step === -1) {
    return (
      <div>
        <p className="font-serif text-xl font-medium text-ink-900">You&rsquo;re in!</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">{WELCOME}</p>

        {role === 'worker' && (
          <div className="mt-4 space-y-3">
            <ul className="space-y-2 text-sm text-ink-700">
              {[
                'This platform helps you build a verified record through honest work and fair pay',
                'You have the right to fair pay, respectful treatment, and to report any employer who treats you unfairly',
                'More completed jobs means a stronger profile and access to better opportunities',
                'Your work speaks for you here, not your history',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <HeartHandshake size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-forest-600/5 p-3">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-forest-600" />
              <span className="text-xs text-ink-800">
                By joining, I agree to conduct myself honestly and complete assigned jobs to the best of my ability.
              </span>
            </label>
          </div>
        )}

        <p className="mt-4 text-sm font-semibold text-ink-900">
          {role === 'worker'
            ? `Hi ${firstName}! Just a few quick questions so we can get to know you better.`
            : 'Thanks for your interest in BeyondX! A few quick questions to help us serve you better.'}
        </p>

        <button
          type="button"
          disabled={role === 'worker' && !agreed}
          onClick={() => setStep(0)}
          className="mt-5 w-full rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Let&rsquo;s Go →
        </button>
      </div>
    )
  }

  /* ----------------------------- questions ----------------------------- */
  const total = questions.length
  const isLast = step === total - 1
  const pct = Math.round(((step + 1) / total) * 100)

  return (
    <div>
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-clay-500">
            Question {step + 1} of {total}
          </span>
          <span className="text-xs text-ink-700">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-forest-600 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <label htmlFor="ob-answer" className="block font-serif text-lg font-medium leading-snug text-ink-900">
        {questions[step]}
      </label>
      <textarea
        id="ob-answer"
        ref={inputRef}
        rows={3}
        value={answers[step]}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer…"
        className="mt-3 w-full rounded-xl border border-ink-900/15 bg-white p-3 text-sm text-ink-900 outline-none transition-colors focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30"
      />

      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => { setError(null); setStep((s) => s - 1) }}
          className="flex items-center gap-1 rounded-full border border-ink-900/15 px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5"
        >
          <ChevronLeft size={16} aria-hidden="true" /> Back
        </button>
        <button
          type="button"
          onClick={isLast ? finish : next}
          disabled={sending}
          className="flex-1 rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70"
        >
          {sending ? 'Sending…' : isLast ? 'Send My Answers' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
